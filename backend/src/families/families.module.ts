import { Module } from '@nestjs/common';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';
import { PresenceService } from './presence.service';
import { FamilyAccessService } from '../common/family-access.service';

@Module({
  controllers: [FamiliesController],
  providers: [FamiliesService, PresenceService, FamilyAccessService],
})
export class FamiliesModule {}
