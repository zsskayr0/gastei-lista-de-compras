import { useAppStore, type ThemePref, type DensityPref } from '../../state/appStore';
import { SettingsScreen } from './SettingsScreen';

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-[var(--radius-md)] border border-[var(--color-border)] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`min-h-[40px] flex-1 rounded-[calc(var(--radius-md)-2px)] text-sm font-medium transition-colors duration-[var(--motion-fast)] ${
            value === opt.value
              ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-[44px] items-center justify-between gap-3 py-2">
      <span className="text-[15px] text-[var(--color-text)]">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors duration-[var(--motion-fast)] ${
          checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-[var(--motion-fast)] ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

export function DeviceSettings() {
  const { theme, density, soundEnabled, hapticsEnabled, hintsEnabled, setTheme, setDensity, setSoundEnabled, setHapticsEnabled, setHintsEnabled } =
    useAppStore();

  return (
    <SettingsScreen title="Aparelho">
      <div className="space-y-6 py-2">
        <div>
          <p className="mb-2 text-sm text-[var(--color-text-muted)]">Tema</p>
          <SegmentedControl<ThemePref>
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
              { value: 'auto', label: 'Automático' },
            ]}
          />
        </div>

        <div>
          <p className="mb-2 text-sm text-[var(--color-text-muted)]">Densidade</p>
          <SegmentedControl<DensityPref>
            value={density}
            onChange={setDensity}
            options={[
              { value: 'compact', label: 'Compacta' },
              { value: 'comfortable', label: 'Confortável' },
            ]}
          />
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          <Toggle checked={soundEnabled} onChange={setSoundEnabled} label="Som" />
          <Toggle checked={hapticsEnabled} onChange={setHapticsEnabled} label="Vibração" />
          <Toggle checked={hintsEnabled} onChange={setHintsEnabled} label="Mostrar dicas" />
        </div>
      </div>
    </SettingsScreen>
  );
}
