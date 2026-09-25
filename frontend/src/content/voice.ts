// Voz e tom (§10 do FRONTEND.md). Casa: calorosa, doméstica, humor leve.
// Corporativo: direta, contida, sem piada. Humor só em momentos de baixo
// custo (vazio, conclusão, primeira vez) — nunca em erro/sync/exclusão/desfazer.
// Exemplos da especificação servem de calibre, não são a lista fechada —
// este conjunto pode crescer sem quebrar a API do módulo.

export const voice = {
  inboxEmpty: [
    'Nada por aqui. Um silêncio suspeito.',
    'Inbox limpo. Aproveite antes que alguém lembre de algo.',
    'Vazio. Até parece que ninguém precisa de nada em casa.',
    'Zero pendências. Rara é a paz.',
  ],
  casaListaVazia: [
    'Nenhuma lista ainda. Bora começar uma?',
    'Essa pasta está esperando a primeira lista.',
  ],
  compraConcluida: [
    '{dia} resolvida. Geladeira agradece.',
    'Compra fechada. {itens} itens riscados, missão cumprida.',
    'Pronto. Mais uma {dia} fora da lista de preocupações.',
  ],
  primeiraEntrada: [
    'Primeiro item! O Inbox nasceu pra isso.',
    'Anotado. É assim, simples como deveria ser.',
  ],
  primeiraListaCasa: ['Primeira lista de Casa criada. As próximas ficam ainda mais rápidas.'],
  primeiraVezToqueLongo: ['Dica: segure o botão para criar uma lista direto.'],
  buscaSemResultado: ['Nada encontrado nesta lista.'],
} as const;

type Moment = keyof typeof voice;

const lastUsedKey = (moment: Moment) => `gastei:voice:last:${moment}`;

function fillTemplate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

/** Escolha aleatória sem repetir a última usada (§10). Conveniência por
 * aparelho, guardada em localStorage — não é estado que precisa sincronizar. */
export function pickVoice(moment: Moment, vars?: Record<string, string | number>): string {
  const options = voice[moment];
  let lastUsed: string | null = null;
  try {
    lastUsed = localStorage.getItem(lastUsedKey(moment));
  } catch {
    // localStorage indisponível (modo privado etc.) — segue sem memória.
  }

  const pool = options.length > 1 ? options.filter((o) => o !== lastUsed) : options;
  const chosen = pool[Math.floor(Math.random() * pool.length)] ?? options[0];

  try {
    localStorage.setItem(lastUsedKey(moment), chosen);
  } catch {
    // idem
  }

  return fillTemplate(chosen, vars);
}
