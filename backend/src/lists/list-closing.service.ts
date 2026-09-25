import { Injectable, Logger } from '@nestjs/common';
import { List, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Encerramento de lista — regra de negócio única no servidor (BACKEND.md §4.3)
 * para não divergir entre aparelhos: snapshot de histórico, sobras (uma única
 * vez) e, para Corporativo, geração automática da próxima lista a partir do
 * template padrão.
 */
@Injectable()
export class ListClosingService {
  private readonly logger = new Logger(ListClosingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async closeList(listId: string) {
    return this.prisma.$transaction(async (tx) => {
      const list = await tx.list.findUnique({
        where: { id: listId },
        include: { items: { where: { deletedAt: null } }, family: true },
      });
      if (!list || list.status !== 'active') return null;

      const hasChecked = list.items.some((i) => i.state === 'checked');

      const snapshot = list.items
        .filter((i) => i.state !== 'removed')
        .map((i) => ({
          name: i.name,
          categoryId: i.categoryId,
          quantityPlanned: i.quantityPlanned,
          quantityBought: i.quantityBought,
          checked: i.state === 'checked',
          isCarryover: i.isCarryover,
        }));

      await tx.archivedList.create({
        data: {
          listId: list.id,
          folder: list.folder,
          closedAt: new Date(),
          snapshot,
        },
      });

      await tx.list.update({
        where: { id: list.id },
        data: { status: 'archived', closedAt: new Date(), phase: null },
      });

      if (!hasChecked) {
        this.logger.log(`Lista ${list.id} encerrada sem itens riscados — sem rastro em última compra.`);
      }

      // Sobras: item não comprado (total ou parcialmente) e ainda não marcado
      // como sobra antes. Só acontece uma vez — a especificação aceita que,
      // se sobrar de novo, o item simplesmente não reaparece.
      const leftovers = list.items.filter(
        (i) =>
          i.state === 'pending' &&
          (i.quantityPlanned ?? 0) > 0 &&
          !i.isCarryover,
      );

      if (leftovers.length === 0) {
        return { list, nextListId: null as string | null };
      }

      let destinationListId: string;

      if (list.folder === 'corporativo') {
        const nextList = await this.createNextCorporateList(tx as unknown as Tx, list);
        destinationListId = nextList.id;
      } else {
        destinationListId = await this.getOrCreateInbox(tx as unknown as Tx, list.familyId);
      }

      await (tx as unknown as Tx).listItem.createMany({
        data: leftovers.map((i) => ({
          listId: destinationListId,
          catalogItemId: i.catalogItemId,
          name: i.name,
          categoryId: i.categoryId,
          quantityExpected: i.quantityExpected,
          quantityPlanned: i.quantityPlanned,
          state: 'pending' as const,
          isCarryover: true,
          addedByUserId: i.addedByUserId,
          lastModifiedByUserId: i.addedByUserId,
        })),
      });

      return { list, nextListId: destinationListId };
    });
  }

  private async getOrCreateInbox(tx: Tx, familyId: string): Promise<string> {
    const existing = await tx.list.findFirst({
      where: { familyId, folder: 'inbox', status: 'active' },
    });
    if (existing) return existing.id;

    const created = await tx.list.create({
      data: { familyId, folder: 'inbox', title: 'Inbox', status: 'active' },
    });
    return created.id;
  }

  private async createNextCorporateList(tx: Tx, closedList: List) {
    const template = await tx.template.findFirst({
      where: { familyId: closedList.familyId, isDefault: true },
      include: { items: { include: { catalogItem: true } } },
    });

    const created = await tx.list.create({
      data: {
        familyId: closedList.familyId,
        folder: 'corporativo',
        title: closedList.title,
        status: 'active',
        phase: 'montar',
        templateId: template?.id,
      },
    });

    if (template) {
      // [aberto #5 em BACKEND.md] valor inicial de "quantity_planned" ao gerar
      // a partir do template: mantido vazio (não pré-preenchido) até a decisão
      // do Diogo — só o snapshot do catálogo (quantity_expected) é copiado.
      await tx.listItem.createMany({
        data: template.items.map((ti) => ({
          listId: created.id,
          catalogItemId: ti.catalogItemId,
          name: ti.catalogItem.name,
          categoryId: ti.catalogItem.categoryId,
          quantityExpected: ti.defaultQuantity ?? ti.catalogItem.expectedQuantity,
          quantityPlanned: null,
          state: 'pending' as const,
          addedByUserId: closedList.familyId, // placeholder overwritten below
          lastModifiedByUserId: closedList.familyId,
        })),
      });

      // addedByUserId must reference a real user — use the family owner as the
      // system actor for auto-generated template items.
      const family = await tx.family.findUnique({ where: { id: closedList.familyId } });
      if (family) {
        await tx.listItem.updateMany({
          where: { listId: created.id },
          data: { addedByUserId: family.ownerUserId, lastModifiedByUserId: family.ownerUserId },
        });
      }
    }

    return created;
  }
}
