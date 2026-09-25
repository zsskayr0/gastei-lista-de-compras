import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

const ENTITY_TYPES = ['list', 'list_item'] as const;

export class SyncEventDto {
  @IsUUID()
  id: string;

  @IsIn(ENTITY_TYPES)
  entityType: (typeof ENTITY_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  field: string;

  @IsOptional()
  value: unknown;

  @IsUUID()
  actorDeviceId: string;

  @IsDateString()
  clientTimestamp: string;
}

export class PushSyncDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SyncEventDto)
  events: SyncEventDto[];
}
