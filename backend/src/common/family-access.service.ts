import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FamilyRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FamilyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertMember(userId: string, familyId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Você não pertence a esta família.');
    }
    return membership;
  }

  async assertRole(userId: string, familyId: string, roles: FamilyRole[]) {
    const membership = await this.assertMember(userId, familyId);
    if (!roles.includes(membership.role)) {
      throw new ForbiddenException('Permissão insuficiente para esta ação.');
    }
    return membership;
  }

  async assertListAccess(userId: string, listId: string) {
    const list = await this.prisma.list.findUnique({ where: { id: listId } });
    if (!list || list.deletedAt) {
      throw new NotFoundException('Lista não encontrada.');
    }
    await this.assertMember(userId, list.familyId);
    return list;
  }
}
