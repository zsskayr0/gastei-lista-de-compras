/** Normaliza texto para agrupar duplicatas no Inbox (§7): minúsculo, sem
 * acento, espaços colapsados. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

export function weekdayName(date = new Date()): string {
  return WEEKDAYS[date.getDay()];
}

/** Um nome por linha; ignora linhas vazias e repetidas (comparação sem
 * acento/caixa) — parsing do "colar lista" do catálogo (§13 do FRONTEND.md). */
export function parseNameList(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    // Tira marcador de lista ("- ", "* ", "• ", "1. ", "2) ") mas preserva nomes que começam com número ("7 up").
    const name = line.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, '').trim();
    const key = normalizeText(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/** "agora", "há 5 min", "há 3 h", "há 2 d" — para status de sincronização. */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'nunca';
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}
