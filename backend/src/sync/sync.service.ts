import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FamilyAccessService } from '../common/family-access.service';
import { PushSyncDto, SyncEventDto } from './dto/sync.dto';

const LIST_ITEM_FIELDS = new Set([
  '__create__',
  'name',
  'categoryId',
  'quantityPlanned',
  'quantityBought',
  'state',
  'deletedAt',
  'note',
]);

const LIST_FIELDS = new Set(['title']);

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  async touchDeviceSession(deviceSessionId: string) {
    await this.prisma.deviceSession.update({
      where: { id: deviceSessionId },
      data: { lastSyncedAt: new Date() },
    });
  }

  async pull(userId: string, listId: string, since?: string) {
    const list = await this.familyAccess.assertListAccess(userId, listId);

    const sinceDate = since ? new Date(since) : new Date(0);
    if (since && Number.isNaN(sinceDate.getTime())) {
      throw new BadRequestException('Cursor "since" inválido — use um timestamp ISO 8601.');
    }

    const events = await this.prisma.syncEvent.findMany({
      where: { listId: list.id, serverTimestamp: { gt: sinceDate } },
      orderBy: { serverTimestamp: 'asc' },
    });

    return {
      events,
      cursor: events.length ? events[events.length - 1].serverTimestamp : sinceDate,
      serverTime: new Date().toISOString(),
    };
  }

  async push(userId: string, listId: string, dto: PushSyncDto) {
    const list = await this.familyAccess.assertListAccess(userId, listId);

    const results: { id: string; applied: boolean; duplicate: boolean }[] = [];

    for (const event of dto.events) {
      const result = await this.applyEvent(userId, list.familyId, list.id, event);
      results.push(result);
    }

    return { results, serverTime: new Date().toISOString() };
  }

  private async applyEvent(userId: string, familyId: string, listId: string, event: SyncEventDto) {
    const existing = await this.prisma.syncEvent.findUnique({ where: { id: event.id } });
    if (existing) {
      return { id: event.id, applied: existing.applied, duplicate: true };
    }

    if (event.entityType === 'list_item' && !LIST_ITEM_FIELDS.has(event.field)) {
      throw new BadRequestException(`Campo "${event.field}" não é sincronizável em list_item.`);
    }
    if (event.entityType === 'list' && !LIST_FIELDS.has(event.field)) {
      throw new BadRequestException(`Campo "${event.field}" não é sincronizável em list.`);
    }

    const clientTimestamp = new Date(event.clientTimestamp);

    // Last-write-wins por campo: se já existe um evento aplicado mais recente
    // para o mesmo (entidade, campo), este evento chega tarde e só fica
    // registrado para auditoria/idempotência, sem sobrescrever o valor atual.
    const latestForField = await this.prisma.syncEvent.findFirst({
      where: { entityType: event.entityType, entityId: event.entityId, field: event.field, applied: true },
      orderBy: { clientTimestamp: 'desc' },
    });

    const isStale = !!latestForField && latestForField.clientTimestamp > clientTimestamp;
    const applied = !isStale;

    if (applied) {
      await this.applyToEntity(userId, listId, event, clientTimestamp);
    }

    try {
      await this.prisma.syncEvent.create({
        data: {
          id: event.id,
          familyId,
          listId,
          entityType: event.entityType,
          entityId: event.entityId,
          field: event.field,
          value: event.value as any,
          actorUserId: userId,
          actorDeviceId: event.actorDeviceId,
          clientTimestamp,
          applied,
        },
      });
    } catch (err) {
      // Duas requisições com o mesmo id chegando em paralelo (retry
      // concorrente do cliente) podem ambas passar o findUnique acima antes
      // de qualquer uma inserir — o unique constraint é a garantia final de
      // idempotência (BACKEND.md §4.1). Perdedor da corrida só reporta
      // duplicado, sem reaplicar nem derrubar a requisição.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const race = await this.prisma.syncEvent.findUnique({ where: { id: event.id } });
        return { id: event.id, applied: race?.applied ?? applied, duplicate: true };
      }
      throw err;
    }

    return { id: event.id, applied, duplicate: false };
  }

  private async applyToEntity(
    userId: string,
    listId: string,
    event: SyncEventDto,
    clientTimestamp: Date,
  ) {
    if (event.entityType === 'list') {
      await this.prisma.list.update({
        where: { id: listId },
        data: { [event.field]: event.value },
      });
      return;
    }

    // list_item
    if (event.field === '__create__') {
      const payload = event.value as {
        name: string;
        categoryId?: string | null;
        catalogItemId?: string | null;
        quantityPlanned?: number | null;
        quantityExpected?: number | null;
      };
      if (!payload?.name) {
        throw new BadRequestException('Criação de item exige "name".');
      }

      await this.prisma.listItem.upsert({
        where: { id: event.entityId },
        create: {
          id: event.entityId,
          listId,
          name: payload.name,
          categoryId: payload.categoryId ?? null,
          catalogItemId: payload.catalogItemId ?? null,
          quantityPlanned: payload.quantityPlanned ?? null,
          quantityExpected: payload.quantityExpected ?? null,
          addedByUserId: userId,
          addedAt: clientTimestamp,
          lastModifiedByUserId: userId,
          lastModifiedAt: clientTimestamp,
          lastModifiedField: '__create__',
        },
        update: {},
      });
      return;
    }

    const data: Record<string, unknown> = {
      [event.field]: event.value,
      lastModifiedByUserId: userId,
      lastModifiedAt: clientTimestamp,
      lastModifiedField: event.field,
    };

    if (event.field === 'state' && event.value === 'checked') {
      data.checkedByUserId = userId;
      data.checkedAt = clientTimestamp;
    }
    if (event.field === 'state' && event.value === 'pending') {
      data.checkedByUserId = null;
      data.checkedAt = null;
    }
    if (event.field === 'note') {
      // Observação livre e curta; vazio limpa. Só string (ou null) é aceita.
      if (event.value != null && typeof event.value !== 'string') {
        throw new BadRequestException('"note" deve ser texto ou nulo.');
      }
      const text = typeof event.value === 'string' ? event.value.trim().slice(0, 200) : '';
      data.note = text || null;
    }
    if (event.field === 'deletedAt') {
      data.deletedAt = event.value ? clientTimestamp : null;
    }

    await this.prisma.listItem.updateMany({ where: { id: event.entityId, listId }, data });
  }
}
