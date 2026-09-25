import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PurchasePhaseCloserService } from './purchase-phase-closer.service';
import { ListClosingService } from '../lists/list-closing.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [PurchasePhaseCloserService, ListClosingService],
})
export class JobsModule {}
