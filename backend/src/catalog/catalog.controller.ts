import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CatalogService } from './catalog.service';
import { BulkCreateCatalogDto, UpdateCatalogItemDto } from './dto/catalog.dto';

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
