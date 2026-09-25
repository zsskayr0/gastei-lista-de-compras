import { Module } from '@nestjs/common';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { FamilyAccessService } from '../common/family-access.service';

@Module({
  controllers: [HistoryController],
  providers: [HistoryService, FamilyAccessService],
})
export class HistoryModule {}
