import { Module } from '@nestjs/common';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { ListClosingService } from './list-closing.service';
import { FamilyAccessService } from '../common/family-access.service';

@Module({
  controllers: [ListsController],
  providers: [ListsService, ListClosingService, FamilyAccessService],
  exports: [ListClosingService],
})
export class ListsModule {}
