import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  /** Tipo real da imagem pelos primeiros bytes: nunca confia no Content-Type do cliente. */
  private sniffImage(buf: Buffer): string | null {
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return 'image/png';
    }
    if (
      buf.length > 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'image/webp';
    }
    return null;
  }

  async setImage(userId: string, catalogItemId: string, data: Buffer) {
    const item = await this.prisma.catalogItem.findUnique({ where: { id: catalogItemId } });
    if (!item) throw new NotFoundException('Item de catálogo não encontrado.');
    await this.familyAccess.assertRole(userId, item.familyId, ['owner']);

    const mime = this.sniffImage(data);
    if (!mime) throw new BadRequestException('Formato de imagem não suportado (use JPG, PNG ou WebP).');

    const [, updated] = await this.prisma.$transaction([
      this.prisma.catalogImage.upsert({
        where: { catalogItemId },
        create: { catalogItemId, mime, data },
        update: { mime, data },
      }),
      this.prisma.catalogItem.update({ where: { id: catalogItemId }, data: { imageUpdatedAt: new Date() } }),
    ]);
    return updated;
  }

  async removeImage(userId: string, catalogItemId: string) {
    const item = await this.prisma.catalogItem.findUnique({ where: { id: catalogItemId } });
    if (!item) throw new NotFoundException('Item de catálogo não encontrado.');
    await this.familyAccess.assertRole(userId, item.familyId, ['owner']);

    const [, updated] = await this.prisma.$transaction([
      this.prisma.catalogImage.deleteMany({ where: { catalogItemId } }),
      this.prisma.catalogItem.update({ where: { id: catalogItemId }, data: { imageUpdatedAt: null } }),
    ]);
    return updated;
  }

  async getImage(catalogItemId: string) {
    const image = await this.prisma.catalogImage.findUnique({ where: { catalogItemId } });
    if (!image) throw new NotFoundException('Sem imagem.');
    return image;
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
