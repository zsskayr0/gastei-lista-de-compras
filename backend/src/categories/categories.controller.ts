import { Body, Controller, Delete, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

// A listagem continua em GET /families/:familyId/categories (FamiliesController).
@UseGuards(JwtAuthGuard)
@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post('families/:familyId/categories')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId') familyId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(user.userId, familyId, dto);
  }

  @Patch('categories/:id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(user.userId, id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(200)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('reassignTo') reassignTo?: string,
  ) {
    return this.categoriesService.remove(user.userId, id, reassignTo || undefined);
  }
}
