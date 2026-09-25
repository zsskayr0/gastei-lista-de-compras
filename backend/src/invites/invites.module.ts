import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { FamilyAccessService } from '../common/family-access.service';

@Module({
  controllers: [InvitesController],
  providers: [InvitesService, FamilyAccessService],
})
export class InvitesModule {}
