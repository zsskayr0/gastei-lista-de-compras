import { ApiError, NetworkError } from '../api/client';

export interface DescribedError {
  /** Uma linha, específica: o que falhou. */
  title: string;
  /** Causa provável e o que fazer. */
  explanation: string;
  /** Tudo que ajuda a diagnosticar: método, URL, status, ID, stack. */
  technical: string;
}

interface ServerBody {
  message?: string | string[];
  error?: string;
  detail?: string;
  code?: string;
  errorId?: string;
  path?: string;
  timestamp?: string;
  refreshFailure?: string;
  contentType?: string | null;
}

function messageOf(body: ServerBody): string {
  if (Array.isArray(body.message)) return body.message.join('; ');
  return body.message ?? '';
}

function lines(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join('\n');
}

/** Mensagens que vêm em inglês do próprio navegador, traduzidas. O texto
 * original continua nos detalhes técnicos. */
function ptBrowser(message: string): string {
  const table: Array<[RegExp, string]> = [
    [/failed to fetch|networkerror when attempting|load failed|network request failed/i, 'falha de rede ao conectar'],
    [/invalid url/i, 'endereço (URL) inválido'],
    [/quota|storage.*full|disk.*full/i, 'armazenamento do aparelho cheio'],
    [/maximum update depth/i, 'loop de atualização na tela'],
    [/unexpected token|json/i, 'resposta em formato inválido (não é JSON)'],
    [/timed? ?out|timeout/i, 'tempo esgotado'],
    [/failed to register a serviceworker/i, 'não foi possível registrar o cache offline'],
    [/is not a function|is not defined|cannot read prop|undefined/i, 'valor ausente ou inesperado no código'],
  ];
  const hit = table.find(([re]) => re.test(message));
  return hit ? hit[1] : message;
}

function describeApi(err: ApiError, context: string): DescribedError {
  const body = (typeof err.body === 'object' && err.body ? err.body : {}) as ServerBody;
  const msg = messageOf(body);
  const where = `${err.method} ${err.url}`;

  const technical = lines(
    `Ação: ${context}`,
    `Requisição: ${where}`,
    `Status: HTTP ${err.status}`,
    body.errorId && `ID do erro: ${body.errorId} (procure no log: docker compose logs gastei-server | findstr ${body.errorId})`,
    body.error && `Tipo: ${body.error}`,
    body.code && `Código: ${body.code}`,
    msg && `Mensagem do servidor: ${msg}`,
    body.detail && `Detalhe: ${body.detail}`,
    body.refreshFailure && `Renovação de sessão: ${body.refreshFailure}`,
    body.contentType && `Content-Type recebido: ${body.contentType}`,
    body.timestamp && `Horário no servidor: ${body.timestamp}`,
  );

  const s = err.status;
  let title: string;
  let explanation: string;

  if (s === 400) {
    title = `Dados recusados pelo servidor (${context})`;
    explanation = msg
      ? `O servidor não aceitou os dados enviados: ${msg}`
      : 'O servidor não aceitou os dados enviados (requisição inválida).';
  } else if (s === 401) {
    const isCredentials = /credenciais/i.test(msg);
    title = isCredentials ? 'E-mail ou senha incorretos' : `Sessão não autorizada (${context})`;
    explanation = isCredentials
      ? 'O servidor não reconheceu essa combinação de e-mail e senha.'
      : `O servidor recusou seu acesso${msg ? `: ${msg}` : '.'} ${
          body.refreshFailure
            ? `Além disso, ${body.refreshFailure}. Saia e entre de novo em Ajustes > Conta.`
            : 'Saia e entre de novo em Ajustes > Conta.'
        }`;
  } else if (s === 403) {
    title = `Sem permissão (${context})`;
    explanation = `Seu papel na família não permite essa ação${msg ? `: ${msg}` : '.'}`;
  } else if (s === 404) {
    title = `Não encontrado (${context})`;
    explanation = `O servidor não achou o que foi pedido${msg ? `: ${msg}` : '.'} ${
      err.url.includes('/api/') ? '' : 'A URL da API pode estar errada.'
    }`.trim();
  } else if (s === 409) {
    title = body.code === 'already_in_family' ? 'Você já participa de uma família' : `Conflito (${context})`;
    explanation = msg || 'O servidor recusou por conflito com dados que já existem (ex.: e-mail já cadastrado).';
  } else if (s === 422) {
    title = `Conta sem família (${context})`;
    explanation = msg || 'A resposta do servidor veio incompleta.';
  } else if (s === 429) {
    title = 'Muitas tentativas seguidas';
    explanation = 'O servidor limitou as requisições. Aguarde um minuto e tente de novo.';
  } else if (s >= 500) {
    title = `Erro interno do servidor (${context})`;
    explanation = lines(
      `O servidor falhou ao processar isso: ${body.detail || msg || 'sem detalhe'}.`,
      body.errorId && `Anote o ID ${body.errorId}: com ele o log do servidor mostra o erro completo.`,
    );
  } else {
    title = `Erro HTTP ${s} (${context})`;
    explanation = msg || 'Resposta inesperada do servidor.';
  }

  return { title, explanation, technical };
}

function describeNetwork(err: NetworkError, context: string): DescribedError {
  const mixed =
    typeof location !== 'undefined' && location.protocol === 'https:' && err.url.startsWith('http:')
      ? 'O app está em HTTPS mas a API em HTTP: o navegador bloqueia (conteúdo misto). '
      : '';
  return {
    title: `Sem conexão com o servidor (${context})`,
    explanation:
      `${mixed}Não consegui falar com ${(() => { try { return new URL(err.url).origin; } catch { return err.url; } })()}. Confira: (1) Tailscale conectado neste aparelho, ` +
      `(2) o PC/servidor está ligado e o container "gastei-server" rodando, (3) a URL do app é a mesma do servidor.`,
    technical: lines(
      `Ação: ${context}`,
      `Requisição: ${err.method} ${err.url}`,
      `Erro do navegador: ${ptBrowser(err.causeMessage)} (original: ${err.causeMessage})`,
      typeof navigator !== 'undefined' && `Navegador reporta online: ${navigator.onLine ? 'sim' : 'não'}`,
      typeof location !== 'undefined' && `Página aberta em: ${location.href}`,
    ),
  };
}

export function describeError(err: unknown, context: string): DescribedError {
  if (err instanceof ApiError) return describeApi(err, context);
  if (err instanceof NetworkError) return describeNetwork(err, context);

  if (err instanceof Error) {
    return {
      title: `${ptBrowser(err.message)} (${context})`,
      explanation: `Falha inesperada no app ao executar "${context}". Copie os detalhes técnicos e envie.`,
      technical: lines(`Ação: ${context}`, `Tipo: ${err.name}`, `Mensagem: ${ptBrowser(err.message)} (original: ${err.message})`, err.stack && `Stack:\n${err.stack}`),
    };
  }

  let raw: string;
  try {
    raw = typeof err === 'string' ? err : JSON.stringify(err);
  } catch {
    raw = String(err);
  }
  return {
    title: `Erro desconhecido (${context})`,
    explanation: `Algo foi lançado que não é um erro padrão: ${raw}`,
    technical: lines(`Ação: ${context}`, `Valor: ${raw}`),
  };
}
