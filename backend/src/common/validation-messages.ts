import { BadRequestException, ValidationError } from '@nestjs/common';

// Nomes de campo como o usuário os enxerga.
const LABELS: Record<string, string> = {
  name: 'o nome',
  email: 'o e-mail',
  password: 'a senha',
  newPassword: 'a nova senha',
  familyName: 'o nome da família',
  deviceName: 'o nome do aparelho',
  refreshToken: 'o token de renovação',
  token: 'o token',
  familyId: 'o id da família',
  listId: 'o id da lista',
  folder: 'a pasta',
  title: 'o título',
  phase: 'a fase',
  status: 'o status',
  templateId: 'o modelo',
  categoryId: 'a categoria',
  frequency: 'a frequência',
  expectedQuantity: 'a quantidade esperada',
  illustrationId: 'a ilustração',
  items: 'a lista de itens',
  events: 'a lista de eventos',
  id: 'o id',
  entityType: 'o tipo de entidade',
  entityId: 'o id da entidade',
  field: 'o campo',
  actorDeviceId: 'o id do aparelho',
  clientTimestamp: 'o horário do aparelho',
};

function label(path: string): string {
  const last = path.split('.').pop() ?? path;
  const base = LABELS[last] ?? `o campo "${last}"`;
  return path.includes('.') && /\.\d+\./.test(path) ? `${base} (em ${path})` : base;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function translate(constraint: string, original: string, path: string): string {
  const who = label(path);
  const n = original.match(/(\d+)/)?.[1];
  switch (constraint) {
    case 'isString':
      return `${cap(who)} deve ser um texto.`;
    case 'isEmail':
      return `${cap(who)} deve ser um e-mail válido.`;
    case 'minLength':
      return `${cap(who)} deve ter no mínimo ${n} caractere(s).`;
    case 'maxLength':
      return `${cap(who)} deve ter no máximo ${n} caractere(s).`;
    case 'isNotEmpty':
      return `${cap(who)} não pode ficar vazio.`;
    case 'isUuid':
      return `${cap(who)} deve ser um identificador (UUID) válido.`;
    case 'isEnum':
    case 'isIn':
      return `${cap(who)} tem um valor não permitido.`;
    case 'isArray':
      return `${cap(who)} deve ser uma lista.`;
    case 'arrayMinSize':
      return `${cap(who)} deve ter ao menos ${n} item(ns).`;
    case 'isDateString':
      return `${cap(who)} deve ser uma data/hora válida (ISO 8601).`;
    case 'isNumber':
      return `${cap(who)} deve ser um número.`;
    case 'whitelistValidation':
      return `O campo "${path.split('.').pop()}" não é aceito nesta requisição.`;
    default:
      return `${cap(who)} é inválido (${original}).`;
  }
}

function flatten(errors: ValidationError[], parent = ''): string[] {
  const out: string[] = [];
  for (const e of errors) {
    const path = parent ? `${parent}.${e.property}` : e.property;
    for (const [constraint, message] of Object.entries(e.constraints ?? {})) {
      out.push(translate(constraint, message, path));
    }
    if (e.children?.length) out.push(...flatten(e.children, path));
  }
  return out;
}

/** exceptionFactory do ValidationPipe: erros de validação em pt-BR. */
export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException({ message: flatten(errors), error: 'Requisição inválida' });
}
