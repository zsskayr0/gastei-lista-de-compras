import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { HistoryService } from './history.service';

@UseGuards(JwtAuthGuard)
@Controller('families/:familyId/history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('familyId') familyId: string,
    @Query('cursor') cursor?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.historyService.listForFamily(
      user.userId,
      familyId,
      cursor,
      pageSize ? Number(pageSize) : undefined,
    );
  }
}
