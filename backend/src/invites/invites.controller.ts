import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/invites.dto';

@UseGuards(JwtAuthGuard)
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInviteDto) {
    return this.invitesService.create(user.userId, dto.familyId);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('familyId') familyId: string) {
    return this.invitesService.listForFamily(user.userId, familyId);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.invitesService.cancel(user.userId, id);
  }
}
