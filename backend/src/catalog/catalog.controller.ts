import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  PayloadTooLargeException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CatalogService } from './catalog.service';
import { BulkCreateCatalogDto, UpdateCatalogItemDto } from './dto/catalog.dto';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Lê o corpo cru (a imagem) com teto de tamanho: o parser de JSON do Nest não toca em image/*. */
function readBody(req: Request, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        // Passou do teto: descarta o que veio e segue lendo (para responder 413 de forma limpa),
        // mas corta a conexão se o envio continuar absurdamente além do limite.
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
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('families/:familyId/catalog')
  listForFamily(@CurrentUser() user: AuthenticatedUser, @Param('familyId') familyId: string) {
    return this.catalogService.listForFamily(user.userId, familyId);
  }

  @Patch('catalog/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCatalogItemDto,
  ) {
    return this.catalogService.update(user.userId, id, dto);
  }

  @Post('catalog/:id/image')
  @HttpCode(200)
  async uploadImage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Req() req: Request) {
    const body = await readBody(req, MAX_IMAGE_BYTES);
    if (body.length === 0) throw new BadRequestException('Nenhuma imagem enviada.');
    return this.catalogService.setImage(user.userId, id, body);
  }

  @Delete('catalog/:id/image')
  @HttpCode(200)
  removeImage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.catalogService.removeImage(user.userId, id);
  }

  @Delete('catalog/:id')
  @HttpCode(200)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.catalogService.remove(user.userId, id);
  }

  @Post('catalog/bulk')
  bulkCreate(@CurrentUser() user: AuthenticatedUser, @Body() dto: BulkCreateCatalogDto) {
    return this.catalogService.bulkCreate(user.userId, dto);
  }
}

/** Entrega a foto para <img> (que não manda Authorization). O id é um UUID
 * impossível de adivinhar e o app só roda na rede privada (Tailscale); a foto
 * só tem o produto, nada pessoal. Sem guard de propósito. */
@Controller('media/catalog')
export class CatalogMediaController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get(':id')
  async image(@Param('id') id: string, @Res() res: Response) {
    const image = await this.catalogService.getImage(id);
    res.setHeader('Content-Type', image.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // a URL muda (?v=) a cada troca
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(Buffer.from(image.data));
  }
}
