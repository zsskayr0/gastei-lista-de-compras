import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FamilyAccessService } from '../common/family-access.service';

@Injectable()
export class DictionaryTermsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  async listForFamily(userId: string, familyId: string) {
    // [decidido em BACKEND.md §4.2] termos novos, só Dono.
    await this.familyAccess.assertRole(userId, familyId, ['owner']);
    return this.prisma.dictionaryTerm.findMany({
      where: { familyId, promotedToCatalogItemId: null },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async promote(userId: string, termId: string) {
    const term = await this.prisma.dictionaryTerm.findUnique({ where: { id: termId } });
    if (!term) throw new NotFoundException('Termo não encontrado.');

    await this.familyAccess.assertRole(userId, term.familyId, ['owner']);

    return this.prisma.$transaction(async (tx) => {
      const catalogItem = await tx.catalogItem.create({
        data: {
          familyId: term.familyId,
          name: term.term,
          categoryId: term.guessedCategoryId,
          frequency: 'rara',
        },
      });

      await tx.dictionaryTerm.update({
        where: { id: term.id },
        data: { promotedToCatalogItemId: catalogItem.id },
      });

      return catalogItem;
    });
  }

  /** Chamado pelo cliente ao criar um item avulso, para alimentar o dicionário. */
  async recordTerm(familyId: string, term: string, guessedCategoryId?: string) {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return;

    const existing = await this.prisma.dictionaryTerm.findUnique({
      where: { familyId_term: { familyId, term: normalized } },
    });

    if (existing) {
      await this.prisma.dictionaryTerm.update({
        where: { id: existing.id },
        data: { usageCount: { increment: 1 }, lastSeenAt: new Date() },
      });
      return;
    }

    await this.prisma.dictionaryTerm.create({
      data: { familyId, term: normalized, guessedCategoryId },
    });
  }
}
