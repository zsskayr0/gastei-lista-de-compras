import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FamilyAccessService } from '../common/family-access.service';
import { ListClosingService } from './list-closing.service';
import { CreateListDto, UpdateListDto } from './dto/lists.dto';

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService,
    private readonly closing: ListClosingService,
  ) {}

  async listForFamily(userId: string, familyId: string) {
    await this.familyAccess.assertMember(userId, familyId);
    return this.prisma.list.findMany({
      where: { familyId, status: 'active', deletedAt: null },
      include: { items: { where: { deletedAt: null } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateListDto) {
    await this.familyAccess.assertMember(userId, dto.familyId);

    return this.prisma.list.create({
      data: {
        familyId: dto.familyId,
        folder: dto.folder,
        title: dto.title,
        icon: dto.icon || null,
        templateId: dto.templateId,
        phase: dto.folder === 'corporativo' ? 'montar' : null,
        purchasePhaseStartedAt: null,
      },
    });
  }

  async findById(userId: string, listId: string) {
    const list = await this.familyAccess.assertListAccess(userId, listId);
    return this.prisma.list.findUnique({
      where: { id: list.id },
      include: { items: { where: { deletedAt: null } } },
    });
  }

  async update(userId: string, listId: string, dto: UpdateListDto) {
    const list = await this.familyAccess.assertListAccess(userId, listId);

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.icon !== undefined) data.icon = dto.icon || null;

    if (dto.phase !== undefined) {
      if (list.folder !== 'corporativo') {
        throw new BadRequestException('Fase só se aplica a listas de Corporativo.');
      }
      data.phase = dto.phase;
      if (dto.phase === 'comprar' && list.phase !== 'comprar') {
        data.purchasePhaseStartedAt = new Date();
      }
    }

    if (dto.status === 'archived') {
      await this.closing.closeList(listId);
      return this.prisma.list.findUnique({ where: { id: listId } });
    }

    return this.prisma.list.update({ where: { id: listId }, data });
  }

  async softDelete(userId: string, listId: string) {
    await this.familyAccess.assertListAccess(userId, listId);
    return this.prisma.list.update({
      where: { id: listId },
      data: { deletedAt: new Date(), status: 'deleted' },
    });
  }
}
