import { sessionRepo } from '../storage/repos';
import type { AuthSession } from '../../types/domain';

/*
 * Cliente HTTP fino. Nunca é chamado no caminho síncrono de uma tela —
 * toda leitura vem do armazenamento local; isto aqui só alimenta e drena
 * a fila de sincronização em segundo plano (§3 do FRONTEND.md).
 */

// Backend monta tudo sob o prefixo global "api" (main.ts: setGlobalPrefix('api')).
const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3283/api';
let baseUrlOverride: string | null = null;

export function setApiBaseUrl(url: string | null) {
  baseUrlOverride = url;
}

export function getApiBaseUrl(): string {
  return baseUrlOverride || DEFAULT_BASE_URL;
}

/** Resposta de erro do servidor (status != 2xx). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    public method: string = '?',
    public url: string = '?',
  ) {
    super(`API error ${status}`);
  }
}

/** Nem chegou resposta: rede caiu, host errado, Tailscale off, CORS, etc. */
export class NetworkError extends Error {
  constructor(
    public method: string,
    public url: string,
    public causeMessage: string,
  ) {
    super(`Network error: ${causeMessage}`);
  }
}

let refreshInFlight: Promise<AuthSession | null> | null = null;

// Motivo da última falha de renovação de token — anexado ao erro 401 final
// pra a tela dizer "sessão expirou" em vez de um "não autorizado" mudo.
let lastRefreshFailure: string | null = null;

async function doRefresh(session: AuthSession): Promise<AuthSession | null> {
  lastRefreshFailure = null;
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) {
      lastRefreshFailure = `renovação da sessão recusada pelo servidor (HTTP ${res.status})`;
      return null;
    }
    const data = await res.json();
    const next: AuthSession = {
      ...session,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? session.refreshToken,
    };
    await sessionRepo.set(next);
    return next;
  } catch (err) {
    // Sem rede — um refresh falho nunca desloga no meio de uma tela (§3).
    lastRefreshFailure = `não foi possível renovar a sessão: ${err instanceof Error ? err.message : String(err)}`;
    return null;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = opts;

  let session = auth ? await sessionRepo.get() : undefined;

  // Base pode ser relativa ("/api", build do Docker servido pelo backend):
  // sem a origem como segundo argumento, `new URL` lança "Invalid URL".
  const url = new URL(`${getApiBaseUrl()}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const doFetch = async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && session) headers.Authorization = `Bearer ${session.accessToken}`;
    try {
      return await fetch(url.toString(), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new NetworkError(method, url.toString(), err instanceof Error ? err.message : String(err));
    }
  };

  let res = await doFetch();

  if (res.status === 401 && auth && session) {
    if (!refreshInFlight) {
      refreshInFlight = doRefresh(session).finally(() => {
        refreshInFlight = null;
      });
    }
    const refreshed = await refreshInFlight;
    if (refreshed) {
      session = refreshed;
      res = await doFetch();
    }
  }

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // corpo vazio
    }
    if (payload === null) {
      payload = { message: `Resposta sem corpo (HTTP ${res.status} ${res.statusText}).` };
    }
    if (res.status === 401 && auth && lastRefreshFailure && typeof payload === 'object') {
      payload = { ...(payload as object), refreshFailure: lastRefreshFailure };
    }
    throw new ApiError(res.status, payload, method, url.toString());
  }

  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    // 200 com corpo que não é JSON: quase sempre é outro servidor/página
    // (URL da API errada) respondendo no lugar do backend.
    throw new ApiError(
      res.status,
      { message: 'O servidor respondeu com algo que não é JSON — a URL da API provavelmente está errada.', contentType: res.headers.get('content-type') },
      method,
      url.toString(),
    );
  }
}
