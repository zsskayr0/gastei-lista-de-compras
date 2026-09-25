import {
  Carrot,
  Beef,
  Croissant,
  Milk,
  Package,
  CupSoda,
  SprayCan,
  HeartPulse,
  Snowflake,
  Tag,
  type LucideIcon,
} from 'lucide-react';

// Mapeia o `icon` semeado pelo backend (auth.service.ts DEFAULT_CATEGORIES)
// para o componente lucide-react. Nome e cor de cada categoria já vêm da
// API (Category.name / Category.color) — item em aberto #3 do
// FRONTEND.md resolvido pelo seed do backend, 10 categorias.
const ICON_BY_SLUG: Record<string, LucideIcon> = {
  carrot: Carrot,
  meat: Beef,
  bread: Croissant,
  milk: Milk,
  jar: Package,
  bottle: CupSoda,
  spray: SprayCan,
  soap: HeartPulse,
  snowflake: Snowflake,
  tag: Tag,
};

export function categoryIcon(slug: string | undefined | null): LucideIcon {
  return (slug && ICON_BY_SLUG[slug]) || Tag;
}
