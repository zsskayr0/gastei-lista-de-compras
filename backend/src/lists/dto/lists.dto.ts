import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
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
  @IsString()
  @MaxLength(32)
  icon?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;
}

export class UpdateListDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  // Texto vazio remove o ícone.
  @IsOptional()
  @IsString()
  @MaxLength(32)
  icon?: string;

  @IsOptional()
  @IsEnum(ListPhase)
  phase?: ListPhase;

  @IsOptional()
  @IsEnum(['active', 'archived'] as const)
  status?: 'active' | 'archived';
}
