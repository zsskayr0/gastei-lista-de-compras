import { reportError } from '../../state/errorStore';
import { syncQueueRepo, sessionRepo, metaRepo } from '../storage/repos';
import { syncApi } from '../api/endpoints';
import type { SyncEvent, SyncEventPayload } from '../../types/domain';

/*
 * Drena a fila local de SyncEvent contra o backend. Nunca bloqueia a UI —
 * é chamado depois de cada escrita otimista (§3 do FRONTEND.md) e também
 * em um timer de fundo para reenviar o que falhou.
 *
 * Backoff exponencial por tentativa, idempotente por `id` (o servidor já
 * deduplica — BACKEND.md §4.1), agrupado por lista porque o endpoint de
 * sync é por lista. Um evento aceito pelo servidor sai da fila mesmo que
 * `applied=false` (perdeu no last-write-wins por campo — não é erro,
 * só significa que outra mudança do mesmo campo chegou depois).
 */

type Listener = (state: SyncEngineState) => void;

export interface SyncEngineState {
  pendingCount: number;
  lastSyncedAt: string | null;
  lastAttemptAt: string | null;
  lastError: boolean;
}

const listeners = new Set<Listener>();
let state: SyncEngineState = {
  pendingCount: 0,
  lastSyncedAt: null,
  lastAttemptAt: null,
  lastError: false,
};
let draining = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((l) => l(state));
}

export function subscribeSyncEngine(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

function backoffMs(attempts: number): number {
  return Math.min(30_000, 1000 * 2 ** attempts);
}

async function refreshPendingCount() {
  state = { ...state, pendingCount: await syncQueueRepo.count() };
  emit();
}

function toPayload(ev: SyncEvent): SyncEventPayload {
  const { listId: _listId, status: _status, attempts: _attempts, ...payload } = ev;
  return payload;
}

export async function enqueueSyncEvent(event: SyncEvent) {
  await syncQueueRepo.enqueue(event);
  await refreshPendingCount();
  void drainQueue();
}

export async function drainQueue(): Promise<void> {
  if (draining) return;
  const session = await sessionRepo.get();
  if (!session) return;

  draining = true;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  try {
    let anyFailure = false;
    let maxAttempts = 0;

    // Loop, não um passo só: um evento enfileirado ENQUANTO este drain já
    // está rodando (ex.: dois toques rápidos no stepper) não passa por
    // outra chamada de drainQueue — aquela chamada vê `draining=true` e
    // retorna sem fazer nada. Sem o loop, esse evento ficava "pending"
    // pra sempre, só sendo pego no próximo reload (foi o bug real por
    // trás de "Comprar não pegou os itens do Montar"). Reler `pending()`
    // a cada volta garante que tudo que chegou nesse meio tempo é pego
    // antes de soltar o cadeado.
    while (true) {
      const pending = await syncQueueRepo.pending();
      if (pending.length === 0) break;

      const byList = new Map<string, SyncEvent[]>();
      for (const ev of pending) {
        ev.status = 'sending';
        await syncQueueRepo.update(ev);
        const list = byList.get(ev.listId) ?? [];
        list.push(ev);
        byList.set(ev.listId, list);
      }

      let roundFailed = false;

      for (const [listId, events] of byList) {
        try {
          state = { ...state, lastAttemptAt: new Date().toISOString() };
          const res = await syncApi.push(listId, events.map(toPayload));
          const resultById = new Map(res.results.map((r) => [r.id, r]));
          for (const ev of events) {
            if (resultById.has(ev.id)) {
              // Aceito pelo servidor (aplicado ou não — LWW decide, não é falha de rede).
              await syncQueueRepo.remove(ev.id);
            } else {
              ev.attempts += 1;
              ev.status = 'failed';
              maxAttempts = Math.max(maxAttempts, ev.attempts);
              await syncQueueRepo.update(ev);
              reportError(
                new Error(`O servidor respondeu OK mas não confirmou o evento ${ev.id} (${ev.entityType}.${ev.field}) — fica na fila e será reenviado.`),
                'Confirmação de sincronização',
              );
            }
          }
          await metaRepo.set('lastSyncedAt', new Date().toISOString());
          state = { ...state, lastSyncedAt: new Date().toISOString(), lastError: false };
        } catch (err) {
          anyFailure = true;
          roundFailed = true;
          const fields = events.map((e) => `${e.entityType}.${e.field}`).join(', ');
          reportError(err, `Enviar ${events.length} mudança(s) ao servidor [lista ${listId}: ${fields}]`);
          for (const ev of events) {
            ev.attempts += 1;
            ev.status = 'failed';
            maxAttempts = Math.max(maxAttempts, ev.attempts);
            await syncQueueRepo.update(ev);
          }
        }
      }

      // Servidor fora do ar: não martela em loop apertado, sai e deixa o
      // backoff agendar a próxima tentativa.
      if (roundFailed) break;
    }

    state = { ...state, lastError: anyFailure };
    await refreshPendingCount();

    if (anyFailure) {
      retryTimer = setTimeout(() => void drainQueue(), backoffMs(maxAttempts));
    }
  } finally {
    draining = false;
  }
}

export async function initSyncEngine() {
  const lastSyncedAt = (await metaRepo.get<string>('lastSyncedAt')) ?? null;
  state = { ...state, lastSyncedAt };
  await refreshPendingCount();
  void drainQueue();

  // Reconexão: reenvia assim que a rede volta.
  window.addEventListener('online', () => void drainQueue());
}
