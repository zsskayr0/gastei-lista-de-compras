import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ItemFrequency } from '@prisma/client';

export class UpdateCatalogItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ItemFrequency)
  frequency?: ItemFrequency;

  @IsOptional()
  @IsNumber()
  expectedQuantity?: number;

  @IsOptional()
  @IsString()
  illustrationId?: string;
}

export class BulkCatalogEntryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ItemFrequency)
  frequency?: ItemFrequency;

  @IsOptional()
  @IsNumber()
  expectedQuantity?: number;
}

export class BulkCreateCatalogDto {
  @IsUUID()
  familyId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkCatalogEntryDto)
  items: BulkCatalogEntryDto[];
}
