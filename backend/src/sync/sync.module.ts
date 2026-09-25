import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { FamilyAccessService } from '../common/family-access.service';

@Module({
  controllers: [SyncController],
  providers: [SyncService, FamilyAccessService],
})
export class SyncModule {}
