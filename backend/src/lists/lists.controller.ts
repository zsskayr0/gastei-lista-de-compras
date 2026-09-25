import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ListsService } from './lists.service';
import { CreateListDto, UpdateListDto } from './dto/lists.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get('families/:familyId/lists')
  listForFamily(@CurrentUser() user: AuthenticatedUser, @Param('familyId') familyId: string) {
    return this.listsService.listForFamily(user.userId, familyId);
  }

  @Post('lists')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateListDto) {
    return this.listsService.create(user.userId, dto);
  }

  @Get('lists/:id')
  findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.listsService.findById(user.userId, id);
  }

  @Patch('lists/:id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateListDto) {
    return this.listsService.update(user.userId, id, dto);
  }

  @Delete('lists/:id')
  softDelete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.listsService.softDelete(user.userId, id);
  }
}
