import {
  ShoppingCart,
  ShoppingBasket,
  Home,
  Briefcase,
  ListChecks,
  Utensils,
  Pizza,
  Coffee,
  Wine,
  Apple,
  Cake,
  Gift,
  PartyPopper,
  Shirt,
  Baby,
  Dog,
  Cat,
  Flower2,
  Pill,
  Sparkles,
  Wrench,
  Car,
  Plane,
  Laptop,
  BookOpen,
  Heart,
  Star,
  Sun,
  Bed,
  Bath,
  type LucideIcon,
} from 'lucide-react';

/** Ícones que dá para escolher numa lista. A chave é o que vai para o banco
 * (List.icon) — nunca renomear uma chave existente. */
export const LIST_ICONS: Record<string, LucideIcon> = {
  cart: ShoppingCart,
  basket: ShoppingBasket,
  home: Home,
  work: Briefcase,
  checks: ListChecks,
  food: Utensils,
  pizza: Pizza,
  coffee: Coffee,
  wine: Wine,
  fruit: Apple,
  cake: Cake,
  gift: Gift,
  party: PartyPopper,
  clothes: Shirt,
  baby: Baby,
  dog: Dog,
  cat: Cat,
  flower: Flower2,
  pharmacy: Pill,
  cleaning: Sparkles,
  tools: Wrench,
  car: Car,
  travel: Plane,
  tech: Laptop,
  books: BookOpen,
  heart: Heart,
  star: Star,
  sun: Sun,
  bed: Bed,
  bath: Bath,
};

export const LIST_ICON_KEYS = Object.keys(LIST_ICONS);

const FOLDER_DEFAULT: Record<string, LucideIcon> = { casa: Home, corporativo: Briefcase };

export function listIcon(icon: string | null | undefined, folder: string): LucideIcon {
  return (icon && LIST_ICONS[icon]) || FOLDER_DEFAULT[folder] || ListChecks;
}
