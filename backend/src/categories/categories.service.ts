import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FamilyAccessService } from '../common/family-access.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  private async assertNameFree(familyId: string, name: string, exceptId?: string) {
    const clash = await this.prisma.category.findFirst({
      where: {
        familyId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    if (clash) throw new ConflictException(`Já existe uma categoria chamada “${clash.name}”.`);
  }

  private async findOwned(userId: string, id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Categoria não encontrada.');
    await this.familyAccess.assertRole(userId, category.familyId, ['owner']);
    return category;
  }

  async create(userId: string, familyId: string, dto: CreateCategoryDto) {
    await this.familyAccess.assertRole(userId, familyId, ['owner']);
    await this.assertNameFree(familyId, dto.name);
    return this.prisma.category.create({ data: { familyId, ...dto } });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOwned(userId, id);
    if (dto.name) await this.assertNameFree(category.familyId, dto.name, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  /** Categoria em uso só sai com `reassignTo`: tudo que a usava passa para a
   * escolhida, numa transação. Sem uso, apaga direto. */
  async remove(userId: string, id: string, reassignTo?: string) {
    const category = await this.findOwned(userId, id);

    if (reassignTo === id) throw new BadRequestException('Escolha outra categoria para receber os itens.');
    if (reassignTo) {
      const target = await this.prisma.category.findUnique({ where: { id: reassignTo } });
      if (!target || target.familyId !== category.familyId) {
        throw new BadRequestException('Categoria de destino inválida.');
      }
    }

    const [catalogCount, listItemCount] = await Promise.all([
      this.prisma.catalogItem.count({ where: { categoryId: id } }),
      this.prisma.listItem.count({ where: { categoryId: id } }),
    ]);

    if ((catalogCount > 0 || listItemCount > 0) && !reassignTo) {
      throw new ConflictException(
        `“${category.name}” está em uso (${catalogCount} no catálogo, ${listItemCount} em listas). Escolha para qual categoria movê-los.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.catalogItem.updateMany({ where: { categoryId: id }, data: { categoryId: reassignTo ?? null } }),
      this.prisma.listItem.updateMany({ where: { categoryId: id }, data: { categoryId: reassignTo ?? null } }),
      this.prisma.dictionaryTerm.updateMany({
        where: { guessedCategoryId: id },
        data: { guessedCategoryId: reassignTo ?? null },
      }),
      this.prisma.category.delete({ where: { id } }),
    ]);

    return { ok: true, movedCatalogItems: catalogCount, movedListItems: listItemCount };
  }
}
