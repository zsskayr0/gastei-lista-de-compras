import { Module } from '@nestjs/common';
import { DictionaryTermsController } from './dictionary-terms.controller';
import { DictionaryTermsService } from './dictionary-terms.service';
import { FamilyAccessService } from '../common/family-access.service';

@Module({
  controllers: [DictionaryTermsController],
  providers: [DictionaryTermsService, FamilyAccessService],
  exports: [DictionaryTermsService],
})
export class DictionaryTermsModule {}
