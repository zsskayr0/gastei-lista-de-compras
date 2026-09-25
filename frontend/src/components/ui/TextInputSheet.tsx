import { useEffect, useRef, useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

interface TextInputSheetProps {
  open: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel: string;
  /** Permite confirmar vazio (ex.: apagar uma observação). */
  allowEmpty?: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

/** Sheet genérico de "um campo de texto + confirmar" — usado pra criar e
 * renomear listas, e renomear itens. Mesmo padrão visual da Entrada (§5),
 * só que fecha ao confirmar (não é uma ação repetível). */
export function TextInputSheet({
  open,
  title,
  placeholder = 'Nome',
  initialValue = '',
  confirmLabel,
  allowEmpty = false,
  onClose,
  onSubmit,
}: TextInputSheetProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, initialValue]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed && !allowEmpty) return;
    onSubmit(trimmed);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="px-4 pb-4 pt-3"
      >
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">{title}</p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="mb-3 min-h-[48px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
        />
        <Button type="submit" className="w-full" disabled={!allowEmpty && !value.trim()}>
          {confirmLabel}
        </Button>
      </form>
    </BottomSheet>
  );
}
