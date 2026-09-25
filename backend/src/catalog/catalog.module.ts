import { Module } from '@nestjs/common';
import { CatalogController, CatalogMediaController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { FamilyAccessService } from '../common/family-access.service';

@Module({
  controllers: [CatalogController, CatalogMediaController],
  providers: [CatalogService, FamilyAccessService],
})
export class CatalogModule {}
