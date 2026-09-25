import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FamilyAccessService } from '../common/family-access.service';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class HistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  async listForFamily(userId: string, familyId: string, cursor?: string, pageSize = DEFAULT_PAGE_SIZE) {
    // [decidido em BACKEND.md §3.6] histórico é exclusivo do Dono.
    await this.familyAccess.assertRole(userId, familyId, ['owner']);

    const archivedLists = await this.prisma.archivedList.findMany({
      where: { list: { familyId } },
      include: { list: true },
      orderBy: { closedAt: 'desc' },
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const nextCursor =
      archivedLists.length === pageSize ? archivedLists[archivedLists.length - 1].id : null;

    return { items: archivedLists, nextCursor };
  }
}
