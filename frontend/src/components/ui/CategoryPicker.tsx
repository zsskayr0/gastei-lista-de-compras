import { useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import {
  Apple,
  Baby,
  Banana,
  Bandage,
  Bath,
  Battery,
  Bean,
  BedDouble,
  Beef,
  Beer,
  Bone,
  Book,
  Box,
  Cake,
  Camera,
  Candy,
  Car,
  Carrot,
  Cat,
  Check,
  Cherry,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  CupSoda,
  Dog,
  Droplets,
  Drumstick,
  Dumbbell,
  Egg,
  Fish,
  Flower2,
  Fuel,
  Gift,
  GlassWater,
  Glasses,
  Grape,
  Ham,
  Hammer,
  Heart,
  House,
  IceCreamCone,
  Lamp,
  Laptop,
  Leaf,
  Lightbulb,
  Martini,
  Milk,
  Music,
  Nut,
  Package,
  PaintBucket,
  Paintbrush,
  PawPrint,
  Pill,
  Pizza,
  Plug,
  Popcorn,
  Recycle,
  Refrigerator,
  Salad,
  Sandwich,
  Scissors,
  Shirt,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Snowflake,
  Sofa,
  Soup,
  Sparkles,
  SprayCan,
  Sprout,
  Star,
  Stethoscope,
  Store,
  Tag,
  Thermometer,
  Toilet,
  Utensils,
  WashingMachine,
  Wheat,
  Wine,
  Wrench,
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { cascadeStyle } from '../../utils/cascade';
import type { Category } from '../../types/domain';

const ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  meat: Beef,
  bottle: Wine,
  snowflake: Snowflake,
  soap: Droplets,
  carrot: Carrot,
  milk: Milk,
  spray: SprayCan,
  jar: Package,
  tag: Tag,
  basket: ShoppingBasket,
  apple: Apple,
  fish: Fish,
  bread: Croissant,
  pizza: Pizza,
  baby: Baby,
  pet: PawPrint,
  pill: Pill,
  coffee: Coffee,
  candy: Candy,
  egg: Egg,
  cookie: Cookie,
  home: House,
  salad: Salad,
  sandwich: Sandwich,
  icecream: IceCreamCone,
  grain: Wheat,
  beer: Beer,
  cocktail: Martini,
  water: GlassWater,
  soda: CupSoda,
  cake: Cake,
  cherry: Cherry,
  grape: Grape,
  banana: Banana,
  nut: Nut,
  bean: Bean,
  drumstick: Drumstick,
  ham: Ham,
  popcorn: Popcorn,
  soup: Soup,
  utensils: Utensils,
  pot: CookingPot,
  leaf: Leaf,
  flower: Flower2,
  sprout: Sprout,
  fridge: Refrigerator,
  laundry: WashingMachine,
  bath: Bath,
  toilet: Toilet,
  bed: BedDouble,
  sofa: Sofa,
  lamp: Lamp,
  bulb: Lightbulb,
  plug: Plug,
  battery: Battery,
  box: Box,
  recycle: Recycle,
  brush: Paintbrush,
  paint: PaintBucket,
  tools: Wrench,
  hammer: Hammer,
  scissors: Scissors,
  health: Stethoscope,
  thermometer: Thermometer,
  bandage: Bandage,
  cat: Cat,
  dog: Dog,
  bone: Bone,
  shirt: Shirt,
  glasses: Glasses,
  gift: Gift,
  book: Book,
  dumbbell: Dumbbell,
  car: Car,
  fuel: Fuel,
  laptop: Laptop,
  phone: Smartphone,
  music: Music,
  camera: Camera,
  cart: ShoppingCart,
  store: Store,
  sparkles: Sparkles,
  heart: Heart,
  star: Star,
};

/** Chaves de ícone oferecidas ao criar/editar categoria (o backend guarda só a chave). */
export const ICON_KEYS = Object.keys(ICONS);

/** Paleta fixa (§9: sem cor livre — mantém a lista coerente nos dois temas). */
export const CATEGORY_COLORS = [
  '#E53935', '#F4511E', '#FB8C00', '#FDD835', '#7CB342', '#43A047',
  '#26A69A', '#29B6F6', '#5C6BC0', '#8E24AA', '#D81B60', '#8D6E63',
  '#78909C', '#546E7A',
];

/** Ícone da categoria (chave vem do backend); desconhecido cai numa etiqueta. */
export function CategoryIcon({ icon, size = 18 }: { icon: string; size?: number }) {
  const Icon = ICONS[icon] ?? Tag;
  return <Icon size={size} strokeWidth={2} />;
}

/** Texto escuro sobre cor clara (ex.: Laticínios amarelo), branco no resto —
 * a cor da categoria nunca é o único sinal, mas o ícone precisa ser legível. */
function onColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.68 ? '#0e1a16' : '#fff';
}

/** Bolinha colorida com o ícone — usada em chips e tiles. */
export function CategoryBadge({ category, size = 28 }: { category: Category; size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: category.color, color: onColor(category.color) }}
    >
      <CategoryIcon icon={category.icon} size={Math.round(size * 0.58)} />
    </span>
  );
}

interface GridProps {
  categories: Category[];
  /** Categoria atualmente escolhida (destaque). */
  value?: string | null;
  onPick: (categoryId: string) => void;
  columns?: 3 | 4;
  compact?: boolean;
}

/** Grade de categorias: cada uma é um tile tingido com a própria cor, ícone e
 * nome. Seleção anima (anel + selo), setas do teclado navegam pela grade. */
export function CategoryGrid({ categories, value, onPick, columns = 3, compact = false }: GridProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
    const step = keys[e.key];
    if (!step) return;
    const tiles = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button[data-tile]') ?? [])];
    const at = tiles.indexOf(document.activeElement as HTMLButtonElement);
    const next = tiles[Math.min(tiles.length - 1, Math.max(0, (at < 0 ? 0 : at) + step))];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label="Categoria"
      onKeyDown={onKeyDown}
      className={'grid gap-2 ' + (columns === 4 ? 'grid-cols-4' : 'grid-cols-3')}
    >
      {categories.map((c, i) => {
        const selected = c.id === value;
        return (
          <button
            key={c.id}
            data-tile
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onPick(c.id)}
            style={{
              ...cascadeStyle(i),
              background: `color-mix(in srgb, ${c.color} ${selected ? 26 : 13}%, transparent)`,
              borderColor: selected ? c.color : `color-mix(in srgb, ${c.color} 30%, transparent)`,
              boxShadow: selected ? `0 0 0 2px ${c.color}` : undefined,
            }}
            className={
              'relative flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border px-1 ' +
              'transition-[transform,background-color,box-shadow] duration-[var(--motion-base)] ease-[var(--motion-ease)] ' +
              'active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ' +
              (compact ? 'min-h-[64px] py-2' : 'min-h-[84px] py-3')
            }
          >
            <CategoryBadge category={c} size={compact ? 26 : 34} />
            <span className="w-full truncate text-center text-xs font-medium text-[var(--color-text)]">{c.name}</span>
            {selected && (
              <span
                aria-hidden
                className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)] animate-[pop-in_var(--motion-base)_var(--motion-ease)]"
              >
                <Check size={11} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface SheetProps {
  open: boolean;
  title: string;
  categories: Category[];
  value?: string | null;
  onClose: () => void;
  onPick: (categoryId: string) => void;
}

/** Seletor em sheet: um toque escolhe e fecha (marca a escolha por um instante
 * para o toque "responder" antes de sumir). */
export function CategoryPickerSheet({ open, title, categories, value, onClose, onPick }: SheetProps) {
  const [picked, setPicked] = useState<string | null>(null);

  const pick = (id: string) => {
    setPicked(id);
    window.setTimeout(() => {
      onPick(id);
      setPicked(null);
      onClose();
    }, 140);
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="max-h-[70vh] overflow-y-auto px-4 pb-4 pt-3">
        <p className="mb-3 truncate text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
          {title}
        </p>
        <CategoryGrid categories={categories} value={picked ?? value} onPick={pick} />
      </div>
    </BottomSheet>
  );
}
