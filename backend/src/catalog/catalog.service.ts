import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FamilyAccessService } from '../common/family-access.service';
import { BulkCreateCatalogDto, UpdateCatalogItemDto } from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  async listForFamily(userId: string, familyId: string) {
    await this.familyAccess.assertMember(userId, familyId);
    return this.prisma.catalogItem.findMany({
      where: { familyId },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async update(userId: string, catalogItemId: string, dto: UpdateCatalogItemDto) {
    const item = await this.prisma.catalogItem.findUnique({ where: { id: catalogItemId } });
    if (!item) throw new NotFoundException('Item de catálogo não encontrado.');

    // [decidido em BACKEND.md §2.1] expected_quantity e demais campos do
    // catálogo só editáveis pelo Dono.
    await this.familyAccess.assertRole(userId, item.familyId, ['owner']);

    return this.prisma.catalogItem.update({ where: { id: catalogItemId }, data: dto });
  }

  /** Remove do catálogo. Itens já presentes em listas ficam (viraram avulsos:
   * `catalogItemId` ali é só uma referência, sem FK); linhas de template somem
   * junto (cascade); um termo que tinha sido promovido volta a "termos novos". */
  async remove(userId: string, catalogItemId: string) {
    const item = await this.prisma.catalogItem.findUnique({ where: { id: catalogItemId } });
    if (!item) throw new NotFoundException('Item de catálogo não encontrado.');
    await this.familyAccess.assertRole(userId, item.familyId, ['owner']);

    await this.prisma.$transaction([
      this.prisma.dictionaryTerm.updateMany({
        where: { promotedToCatalogItemId: catalogItemId },
        data: { promotedToCatalogItemId: null },
      }),
      this.prisma.catalogItem.delete({ where: { id: catalogItemId } }),
    ]);
    return { ok: true };
  }

  async bulkCreate(userId: string, dto: BulkCreateCatalogDto) {
    await this.familyAccess.assertRole(userId, dto.familyId, ['owner']);

    const created = await this.prisma.$transaction(
      dto.items.map((entry) =>
        this.prisma.catalogItem.create({
          data: {
            familyId: dto.familyId,
            name: entry.name,
            categoryId: entry.categoryId,
            frequency: entry.frequency ?? 'rara',
            expectedQuantity: entry.expectedQuantity,
          },
        }),
      ),
    );

    return created;
  }
}
