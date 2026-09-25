import { Transform } from 'class-transformer';
import { IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCategoryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Dê um nome à categoria.' })
  @MaxLength(40)
  name: string;

  @IsHexColor()
  color: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  icon: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'O nome não pode ficar vazio.' })
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  icon?: string;
}
