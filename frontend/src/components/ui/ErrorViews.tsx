import { Component, useEffect, useState, type ReactNode } from 'react';
import { AlertOctagon, ChevronDown, Copy, X } from 'lucide-react';
import { useErrorStore, type ReportedError } from '../../state/errorStore';
import type { DescribedError } from '../../lib/errors/describe';

// navigator.clipboard só existe em contexto seguro (HTTPS) — o app roda em
// http:// via Tailscale, então precisa do fallback com execCommand.
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // cai no fallback
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function fullText(e: DescribedError & { lastAt?: string; count?: number }): string {
  return [
    e.title,
    e.explanation,
    '--- detalhes técnicos ---',
    e.technical,
    e.count && e.count > 1 ? `Ocorreu ${e.count}x (última: ${e.lastAt})` : undefined,
    `App: ${location.href}`,
    `Navegador: ${navigator.userAgent}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function ErrorCard({
  error,
  onDismiss,
}: {
  error: DescribedError & { lastAt?: string; count?: number };
  onDismiss?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);

  return (
    <div role="alert" className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/40 bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-text)]">
      <div className="flex items-start gap-2">
        <AlertOctagon size={16} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--color-danger)]">
            {error.title}
            {error.count && error.count > 1 ? ` · ${error.count}x` : ''}
          </p>
          <p className="mt-1 whitespace-pre-line break-words text-[var(--color-text)]">{error.explanation}</p>
        </div>
        {onDismiss && (
          <button type="button" aria-label="Dispensar erro" onClick={onDismiss} className="flex h-8 w-8 shrink-0 items-center justify-center">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3 pl-6">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)]">
          Detalhes técnicos
          <ChevronDown size={14} className={open ? 'rotate-180' : ''} />
        </button>
        <button
          type="button"
          onClick={async () => setCopied((await copyText(fullText(error))) ? 'ok' : 'fail')}
          className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)]"
        >
          <Copy size={14} /> {copied === 'ok' ? 'Copiado' : copied === 'fail' ? 'Não copiou — selecione o texto' : 'Copiar'}
        </button>
      </div>
      {open && (
        <pre className="mt-2 max-h-64 select-text overflow-auto whitespace-pre-wrap break-words rounded-[var(--radius-sm)] bg-[var(--color-bg)] p-2 text-[11px] leading-snug text-[var(--color-text-muted)]">
          {error.technical}
        </pre>
      )}
    </div>
  );
}

/** Banner global no topo: erros ainda não dispensados (máx. 3 visíveis). */
export function ErrorHost() {
  const items = useErrorStore((s) => s.items);
  const dismiss = useErrorStore((s) => s.dismiss);
  const visible = items.filter((e) => e.banner && e.dismissedAt === null).slice(0, 3);

  if (visible.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col gap-2 p-2 pt-[calc(var(--safe-top)+8px)]">
      {visible.map((e: ReportedError) => (
        <div key={e.id} className="pointer-events-auto">
          <ErrorCard error={e} onDismiss={() => dismiss(e.id)} />
        </div>
      ))}
    </div>
  );
}

/** Falhas fora de qualquer try/catch: erro de script e promessa rejeitada. */
export function useGlobalErrorCapture() {
  const report = useErrorStore((s) => s.report);
  useEffect(() => {
    const onError = (ev: ErrorEvent) => report(ev.error ?? new Error(ev.message), 'Erro não tratado no app');
    const onRejection = (ev: PromiseRejectionEvent) => {
      // Cache offline (Service Worker) é opcional: o app funciona sem ele.
      // Continua no histórico, mas sem banner por cima da tela.
      if (/ServiceWorker/i.test(String(ev.reason?.message ?? ev.reason))) {
        report(ev.reason, 'Registrar cache offline (Service Worker)', { banner: false });
        return;
      }
      report(ev.reason, 'Operação em segundo plano falhou');
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [report]);
}

/** Crash de renderização: em vez de tela preta, mostra o erro completo. */
export class CrashBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    const described = useErrorStore.getState().report(error, 'Tela quebrou ao renderizar');
    void described;
    console.error(info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const err = this.state.error;
    return (
      <div className="safe-top safe-bottom mx-auto flex min-h-full max-w-md flex-col justify-center gap-3 p-4">
        <ErrorCard
          error={{
            title: `A tela quebrou: ${err.name}: ${err.message}`,
            explanation: 'Um erro do app impediu de desenhar esta tela. Copie os detalhes e envie; depois recarregue.',
            technical: err.stack ?? err.message,
          }}
        />
        <button
          onClick={() => location.reload()}
          className="min-h-[48px] rounded-[var(--radius-md)] bg-[var(--color-accent)] font-medium text-[var(--color-accent-fg)]"
        >
          Recarregar
        </button>
      </div>
    );
  }
}
