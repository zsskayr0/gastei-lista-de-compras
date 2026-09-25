import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { FamilyAccessService } from '../common/family-access.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, FamilyAccessService],
})
export class CatalogModule {}
