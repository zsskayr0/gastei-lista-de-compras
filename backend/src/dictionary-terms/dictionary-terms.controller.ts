import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DictionaryTermsService } from './dictionary-terms.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class DictionaryTermsController {
  constructor(private readonly dictionaryTermsService: DictionaryTermsService) {}

  @Get('families/:familyId/dictionary-terms')
  listForFamily(@CurrentUser() user: AuthenticatedUser, @Param('familyId') familyId: string) {
    return this.dictionaryTermsService.listForFamily(user.userId, familyId);
  }

  @Post('dictionary-terms/:id/promote')
  promote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dictionaryTermsService.promote(user.userId, id);
  }
}
