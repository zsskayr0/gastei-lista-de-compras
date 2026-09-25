import { useErrorStore } from '../../state/errorStore';
import { SettingsScreen } from './SettingsScreen';
import { ErrorCard } from '../../components/ui/ErrorViews';
import { Button } from '../../components/ui/Button';

/** Histórico de tudo que falhou neste aparelho (últimos 50, agrupados). */
export function ErrorLogSettings() {
  const items = useErrorStore((s) => s.items);
  const clear = useErrorStore((s) => s.clear);

  return (
    <SettingsScreen title="Registro de erros">
      {items.length === 0 ? (
        <p className="py-8 text-center text-[var(--color-text-muted)]">Nenhum erro registrado neste aparelho.</p>
      ) : (
        <div className="space-y-3">
          {items.map((e) => (
            <div key={e.id}>
              <p className="mb-1 text-xs text-[var(--color-text-faint)]">
                {new Date(e.lastAt).toLocaleString('pt-BR')}
              </p>
              <ErrorCard error={e} />
            </div>
          ))}
          <Button variant="secondary" className="w-full" onClick={clear}>
            Limpar registro
          </Button>
        </div>
      )}
    </SettingsScreen>
  );
}
