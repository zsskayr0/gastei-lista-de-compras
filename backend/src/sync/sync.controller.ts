import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { PushSyncDto } from './dto/sync.dto';

@UseGuards(JwtAuthGuard)
@Controller('lists/:id/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get()
  async pull(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') listId: string,
    @Query('since') since?: string,
  ) {
    const result = await this.syncService.pull(user.userId, listId, since);
    await this.syncService.touchDeviceSession(user.deviceSessionId);
    return result;
  }

  @Post()
  async push(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') listId: string,
    @Body() dto: PushSyncDto,
  ) {
    const result = await this.syncService.push(user.userId, listId, dto);
    await this.syncService.touchDeviceSession(user.deviceSessionId);
    return result;
  }
}
