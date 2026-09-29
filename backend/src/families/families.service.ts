import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FamilyAccessService } from '../common/family-access.service';

@Injectable()
export class FamiliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  async listCategories(userId: string, familyId: string) {
    await this.familyAccess.assertMember(userId, familyId);
    return this.prisma.category.findMany({ where: { familyId }, orderBy: { name: 'asc' } });
  }

  async listMembers(userId: string, familyId: string) {
    await this.familyAccess.assertMember(userId, familyId);
    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
      include: { user: { select: { id: true, name: true, email: true, avatarUpdatedAt: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    return members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      role: m.role,
      avatarUpdatedAt: m.user.avatarUpdatedAt,
    }));
  }

  async syncStatus(userId: string, familyId: string) {
    // [proposta em BACKEND.md §4.4] painel do Dono — última sincronização e
    // pendências por aparelho.
    await this.familyAccess.assertRole(userId, familyId, ['owner']);

    const members = await this.prisma.familyMember.findMany({
      where: { familyId },
      include: {
        user: {
          include: {
            deviceSessions: { where: { revokedAt: null }, orderBy: { lastSyncedAt: 'desc' } },
          },
        },
      },
    });

    return {
      serverTime: new Date().toISOString(),
      members: members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        role: m.role,
        devices: m.user.deviceSessions.map((d) => ({
          deviceSessionId: d.id,
          deviceName: d.deviceName,
          lastSyncedAt: d.lastSyncedAt,
        })),
      })),
    };
  }
}
