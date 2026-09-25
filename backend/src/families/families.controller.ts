import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FamilyAccessService } from '../common/family-access.service';
import { FamiliesService } from './families.service';
import { PresenceService } from './presence.service';

class HeartbeatDto {
  @IsUUID()
  listId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('families/:familyId')
export class FamiliesController {
  constructor(
    private readonly familiesService: FamiliesService,
    private readonly presenceService: PresenceService,
    private readonly familyAccess: FamilyAccessService,
  ) {}

  @Get('categories')
  categories(@CurrentUser() user: AuthenticatedUser, @Param('familyId') familyId: string) {
    return this.familiesService.listCategories(user.userId, familyId);
  }

  @Get('members')
  members(@CurrentUser() user: AuthenticatedUser, @Param('familyId') familyId: string) {
    return this.familiesService.listMembers(user.userId, familyId);
  }

  @Get('sync-status')
  syncStatus(@CurrentUser() user: AuthenticatedUser, @Param('familyId') familyId: string) {
    return this.familiesService.syncStatus(user.userId, familyId);
  }

  @Get('presence')
  async presence(@CurrentUser() user: AuthenticatedUser, @Param('familyId') familyId: string) {
    await this.familyAccess.assertMember(user.userId, familyId);
    return { active: this.presenceService.listActive(familyId) };
  }

  @Post('presence')
  async heartbeat(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId') familyId: string,
    @Body() dto: HeartbeatDto,
  ) {
    await this.familyAccess.assertMember(user.userId, familyId);
    this.presenceService.heartbeat(familyId, user.userId, dto.listId);
    return { ok: true };
  }
}
