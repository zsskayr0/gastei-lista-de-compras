// Fallback de letra inicial estilizada — ilustrações SVG por item de
// catálogo ficam para depois (§9: "cada uma precisa de variante clara/
// escura"; sem asset ainda, este é o estado padrão, não um placeholder
// temporário a esconder).
interface ItemGlyphProps {
  name: string;
  colorHex?: string;
  size?: number;
}

export function ItemGlyph({ name, colorHex, size = 36 }: ItemGlyphProps) {
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] font-display font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42, background: colorHex ?? 'var(--color-text-faint)' }}
      aria-hidden
    >
      {letter}
    </span>
  );
}
