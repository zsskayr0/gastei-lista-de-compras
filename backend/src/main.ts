import { existsSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { validationExceptionFactory } from './common/validation-messages';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ['log', 'warn', 'error'] });

  app.use(helmet({ contentSecurityPolicy: false, hsts: false, crossOriginOpenerPolicy: false, originAgentCluster: false }));
  // Private Network Access: o app instalado (WebView em tauri.localhost) fala com o servidor
  // por IP privado (Tailscale) e o Chrome exige esta resposta no preflight.
  app.use((req: { headers: Record<string, unknown> }, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    if (req.headers['access-control-request-private-network']) res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
  });
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');

  // Cliente web (build do Vite) servido na mesma porta; rotas fora de /api caem no index.html.
  const webRoot = join(__dirname, '..', 'public');
  if (existsSync(webRoot)) {
    app.useStaticAssets(webRoot);
    app.getHttpAdapter().getInstance().get(/^(?!\/api).*/, (_req: unknown, res: { sendFile: (p: string) => void }) =>
      res.sendFile(join(webRoot, 'index.html')),
    );
  }

  const port = Number(process.env.PORT ?? 3283);
  await app.listen(port, '0.0.0.0');
  Logger.log(`Gastei backend ouvindo na porta ${port}`, 'Bootstrap');
}

bootstrap();
