import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  PayloadTooLargeException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Lê o corpo cru (a imagem) com teto de tamanho: o parser de JSON do Nest não toca em image/*. */
function readBody(req: Request, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        chunks.length = 0;
        if (size > limit * 10) req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () =>
      size > limit ? reject(new PayloadTooLargeException('Imagem grande demais (máximo 2 MB).')) : resolve(Buffer.concat(chunks)),
    );
    req.on('error', reject);
  });
}

@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('avatar')
  @HttpCode(200)
  async upload(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    const body = await readBody(req, MAX_IMAGE_BYTES);
    if (body.length === 0) throw new BadRequestException('Nenhuma imagem enviada.');
    return this.usersService.setAvatar(user.userId, body);
  }

  @Delete('avatar')
  @HttpCode(200)
  remove(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.removeAvatar(user.userId);
  }
}

/** Entrega a foto de perfil para <img> (que não manda Authorization). Mesma
 * lógica da foto de catálogo: id em UUID, app só na rede privada. */
@Controller('media/avatar')
export class UserMediaController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async image(@Param('id') id: string, @Res() res: Response) {
    const avatar = await this.usersService.getAvatar(id);
    res.setHeader('Content-Type', avatar.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // a URL muda (?v=) a cada troca
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(Buffer.from(avatar.data));
  }
}
