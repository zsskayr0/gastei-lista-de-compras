import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ListFolder, ListPhase } from '@prisma/client';

export class CreateListDto {
  @IsUUID()
  familyId: string;

  @IsEnum(ListFolder)
  folder: ListFolder;

  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;
}

export class UpdateListDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsEnum(ListPhase)
  phase?: ListPhase;

  @IsOptional()
  @IsEnum(['active', 'archived'] as const)
  status?: 'active' | 'archived';
}
