import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // App privado/self-hosted: o dono precisa ver a causa real de um erro
    // sem caçar no código — devolvemos nome, código (ex.: Prisma P2002) e
    // mensagem da exceção, além de um errorId que também vai pro log.
    const errorId = Math.random().toString(36).slice(2, 10);
    const err = exception instanceof Error ? exception : undefined;
    const code = (exception as { code?: string } | undefined)?.code;

    const body = isHttp
      ? (exception as HttpException).getResponse()
      : {
          message: 'Erro interno do servidor.',
          error: err?.name ?? 'UnknownError',
          detail: err?.message ?? String(exception),
          ...(code ? { code } : {}),
        };

    if (status >= 500) {
      this.logger.error(
        `[${errorId}] ${request.method} ${request.url} -> ${status}`,
        err ? err.stack : String(exception),
      );
    } else {
      this.logger.warn(`[${errorId}] ${request.method} ${request.url} -> ${status}`);
    }

    const PT_ERROR: Record<string, string> = {
      'Bad Request': 'Requisição inválida',
      Unauthorized: 'Não autorizado',
      Forbidden: 'Acesso negado',
      'Not Found': 'Não encontrado',
      Conflict: 'Conflito',
      'Too Many Requests': 'Muitas requisições',
      'Internal Server Error': 'Erro interno do servidor',
    };
    const translated =
      typeof body === 'object' && body && typeof (body as { error?: unknown }).error === 'string'
        ? { error: PT_ERROR[(body as { error: string }).error] ?? (body as { error: string }).error }
        : {};

    response.status(status).json({
      statusCode: status,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      errorId,
      ...(typeof body === 'string' ? { message: body } : body),
      ...translated,
      ...(status === 429 ? { message: 'Muitas requisições em pouco tempo. Aguarde um minuto.' } : {}),
    });
  }
}
