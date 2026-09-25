import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ListClosingService } from '../lists/list-closing.service';

const PURCHASE_PHASE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/**
 * BACKEND.md §4.3 — autoridade única do servidor para encerrar a fase
 * "Comprar" após 24h, evitando que os dois aparelhos calculem isso de forma
 * divergente.
 */
@Injectable()
export class PurchasePhaseCloserService {
  private readonly logger = new Logger(PurchasePhaseCloserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly closing: ListClosingService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredPurchasePhases() {
    const threshold = new Date(Date.now() - PURCHASE_PHASE_TIMEOUT_MS);

    const expiredLists = await this.prisma.list.findMany({
      where: {
        status: 'active',
        phase: 'comprar',
        purchasePhaseStartedAt: { lte: threshold },
      },
    });

    for (const list of expiredLists) {
      this.logger.log(`Encerrando automaticamente a lista ${list.id} (24h em Comprar).`);
      try {
        await this.closing.closeList(list.id);
      } catch (err) {
        this.logger.error(`Falha ao encerrar lista ${list.id}`, err instanceof Error ? err.stack : String(err));
      }
    }
  }
}
