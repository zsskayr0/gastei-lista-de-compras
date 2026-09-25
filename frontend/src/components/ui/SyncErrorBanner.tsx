import { useState } from 'react';
import { WifiOff, X } from 'lucide-react';
import { useSyncStatus } from '../../hooks/useSyncStatus';

/** §8: só aparece com 2min sem sincronizar E fila pendente. Vermelho é a
 * única situação da UI que usa essa cor. Dispensável, não bloqueia a tela,
 * só reaparece se piorar de novo (não fica insistindo a cada 2 min). */
export function SyncErrorBanner() {
  const { showErrorBanner, pendingCount } = useSyncStatus();
  const [dismissed, setDismissed] = useState(false);

  if (!showErrorBanner || dismissed) return null;

  return (
    <div
      role="status"
      className="mx-4 mt-2 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]"
    >
      <WifiOff size={16} className="shrink-0" />
      <span className="flex-1">
        Sem sincronizar há um tempo. {pendingCount} mudança{pendingCount === 1 ? '' : 's'} esperando a rede.
      </span>
      <button aria-label="Dispensar aviso" onClick={() => setDismissed(true)} className="shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
