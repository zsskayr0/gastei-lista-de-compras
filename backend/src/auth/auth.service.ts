import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcceptInviteDto,
  BootstrapFamilyDto,
  ConfirmPasswordResetDto,
  LoginDto,
  RequestPasswordResetDto,
} from './dto/auth.dto';

const DEFAULT_CATEGORIES = [
  { name: 'Hortifruti', color: '#4CAF50', icon: 'carrot' },
  { name: 'Açougue', color: '#E53935', icon: 'meat' },
  { name: 'Padaria', color: '#D7A86E', icon: 'bread' },
  { name: 'Laticínios', color: '#FFF176', icon: 'milk' },
  { name: 'Mercearia', color: '#8D6E63', icon: 'jar' },
  { name: 'Bebidas', color: '#29B6F6', icon: 'bottle' },
  { name: 'Limpeza', color: '#26A69A', icon: 'spray' },
  { name: 'Higiene', color: '#AB47BC', icon: 'soap' },
  { name: 'Congelados', color: '#5C6BC0', icon: 'snowflake' },
  { name: 'Outros', color: '#78909C', icon: 'tag' },
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get refreshTtlMs() {
    const days = Number(this.config.get('REFRESH_TOKEN_TTL_DAYS') ?? 90);
    return days * 24 * 60 * 60 * 1000;
  }

  private async issueTokens(userId: string, email: string, deviceName?: string) {
    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const session = await this.prisma.deviceSession.create({
      data: {
        userId,
        deviceName,
        refreshTokenHash,
        refreshTokenExpiresAt: new Date(Date.now() + this.refreshTtlMs),
      },
    });

    const accessToken = this.jwt.sign(
      { sub: userId, email, deviceSessionId: session.id },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('ACCESS_TOKEN_TTL') ?? '15m',
      },
    );

    return {
      accessToken,
      refreshToken,
      deviceSessionId: session.id,
    };
  }

  async bootstrapOwner(dto: BootstrapFamilyDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: dto.name, email: dto.email, passwordHash },
      });

      const family = await tx.family.create({
        data: { name: dto.familyName, ownerUserId: user.id },
      });

      await tx.familyMember.create({
        data: { familyId: family.id, userId: user.id, role: 'owner' },
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({ ...c, familyId: family.id })),
      });

      await tx.template.create({
        data: { familyId: family.id, name: 'Modelo padrão', isDefault: true },
      });

      return { user, family };
    });

    const tokens = await this.issueTokens(result.user.id, result.user.email, dto.deviceName);
    return {
      user: { id: result.user.id, name: result.user.name, email: result.user.email },
      family: { id: result.family.id, name: result.family.name },
      familyId: result.family.id,
      role: 'owner' as const,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas.');

    const membership = await this.prisma.familyMember.findFirst({ where: { userId: user.id } });

    const tokens = await this.issueTokens(user.id, user.email, dto.deviceName);
    return {
      user: { id: user.id, name: user.name, email: user.email },
      familyId: membership?.familyId ?? null,
      role: membership?.role ?? null,
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token ausente.');

    const candidates = await this.prisma.deviceSession.findMany({
      where: {
        revokedAt: null,
        refreshTokenExpiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    for (const session of candidates) {
      const matches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (matches) {
        // Sliding window: rotate the refresh token and extend expiry silently.
        const newRefreshToken = randomBytes(48).toString('hex');
        const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

        await this.prisma.deviceSession.update({
          where: { id: session.id },
          data: {
            refreshTokenHash: newRefreshTokenHash,
            refreshTokenExpiresAt: new Date(Date.now() + this.refreshTtlMs),
          },
        });

        const accessToken = this.jwt.sign(
          { sub: session.userId, email: session.user.email, deviceSessionId: session.id },
          {
            secret: this.config.get('JWT_ACCESS_SECRET'),
            expiresIn: this.config.get('ACCESS_TOKEN_TTL') ?? '15m',
          },
        );

        return { accessToken, refreshToken: newRefreshToken };
      }
    }

    throw new UnauthorizedException('Refresh token inválido ou expirado.');
  }

  async logout(deviceSessionId: string) {
    await this.prisma.deviceSession.updateMany({
      where: { id: deviceSessionId },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Always respond the same way to avoid leaking which e-mails are registered.
    if (!user) return { ok: true };

    const token = randomUUID();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // No e-mail transport configured for the self-hosted setup yet — log so the
    // Dono can hand the link over manually until SMTP is wired up.
    this.logger.warn(`Password reset token for ${user.email}: ${token}`);
    return { ok: true };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token: dto.token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.deviceSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }

  async acceptInvite(token: string, dto: AcceptInviteDto) {
    const invite = await this.prisma.invite.findUnique({ where: { token } });
    if (!invite) throw new BadRequestException('Convite não encontrado.');
    if (invite.status === 'canceled') throw new BadRequestException('Convite cancelado.');
    if (invite.status === 'used') throw new BadRequestException('Convite já utilizado.');
    if (invite.expiresAt < new Date()) {
      await this.prisma.invite.update({ where: { id: invite.id }, data: { status: 'expired' } });
      throw new BadRequestException('Convite expirado.');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      const alreadyMember = await this.prisma.familyMember.findFirst({
        where: { userId: existing.id },
      });
      if (alreadyMember) {
        throw new ConflictException({
          code: 'already_in_family',
          message: 'Você já participa de uma família. Multi-família chegará em breve.',
        });
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = existing
        ? existing
        : await tx.user.create({ data: { name: dto.name, email: dto.email, passwordHash } });

      const alreadyMember = await tx.familyMember.findFirst({ where: { userId: user.id } });
      if (alreadyMember) {
        throw new ConflictException({
          code: 'already_in_family',
          message: 'Você já participa de uma família. Multi-família chegará em breve.',
        });
      }

      // v1 only ever has Dono (owner) + one convidado — that convidado gets "admin".
      // "member" stays in the enum unused, for the multi-member roadmap.
      await tx.familyMember.create({
        data: { familyId: invite.familyId, userId: user.id, role: 'admin' },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: { status: 'used', usedByUserId: user.id, usedAt: new Date() },
      });

      return user;
    });

    const tokens = await this.issueTokens(result.id, result.email, dto.deviceName);
    return {
      user: { id: result.id, name: result.name, email: result.email },
      familyId: invite.familyId,
      role: 'admin' as const,
      ...tokens,
    };
  }
}
