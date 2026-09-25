import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FamilyAccessService } from '../common/family-access.service';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  async create(userId: string, familyId: string) {
    // [proposta em BACKEND.md §3.6] Dono e Admin podem gerar convites.
    await this.familyAccess.assertRole(userId, familyId, ['owner', 'admin']);

    const invite = await this.prisma.invite.create({
      data: {
        familyId,
        createdByUserId: userId,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return invite;
  }

  async cancel(userId: string, inviteId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { id: inviteId } });
    if (!invite) throw new NotFoundException('Convite não encontrado.');

    await this.familyAccess.assertRole(userId, invite.familyId, ['owner', 'admin']);

    if (invite.status !== 'pending') {
      throw new ForbiddenException('Só é possível cancelar convites pendentes.');
    }

    return this.prisma.invite.update({
      where: { id: inviteId },
      data: { status: 'canceled' },
    });
  }

  async listForFamily(userId: string, familyId: string) {
    await this.familyAccess.assertMember(userId, familyId);
    return this.prisma.invite.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
