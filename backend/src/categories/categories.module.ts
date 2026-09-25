import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { FamilyAccessService } from '../common/family-access.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, FamilyAccessService],
})
export class CategoriesModule {}
