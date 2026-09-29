import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async setAvatar(userId: string, data: Buffer) {
    const mime = this.sniffImage(data);
    if (!mime) throw new BadRequestException('Formato de imagem não suportado (use JPG, PNG ou WebP).');
    const avatarUpdatedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.userAvatar.upsert({
        where: { userId },
        create: { userId, mime, data },
        update: { mime, data },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { avatarUpdatedAt } }),
    ]);
    return { avatarUpdatedAt };
  }

  async removeAvatar(userId: string) {
    await this.prisma.$transaction([
      this.prisma.userAvatar.deleteMany({ where: { userId } }),
      this.prisma.user.update({ where: { id: userId }, data: { avatarUpdatedAt: null } }),
    ]);
    return { avatarUpdatedAt: null };
  }

  async getAvatar(userId: string) {
    const avatar = await this.prisma.userAvatar.findUnique({ where: { userId } });
    if (!avatar) throw new NotFoundException('Sem foto.');
    return avatar;
  }
}
