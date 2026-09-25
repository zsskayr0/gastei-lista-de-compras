import { useSnackbarStore } from '../../state/snackbarStore';

export function SnackbarHost() {
  const items = useSnackbarStore((s) => s.items);
  const dismiss = useSnackbarStore((s) => s.dismiss);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+var(--safe-bottom)+8px)] z-40 flex flex-col items-center gap-2 px-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-floresta)] px-4 py-3 text-[var(--color-gelo)] shadow-[var(--shadow-md)] animate-[fade-in_var(--motion-base)_ease-out]"
        >
          <span className="text-sm">{item.message}</span>
          {item.actionLabel && (
            <button
              className="shrink-0 text-sm font-semibold text-[var(--color-accent)]"
              onClick={() => {
                item.onAction?.();
                dismiss(item.id);
              }}
            >
              {item.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
