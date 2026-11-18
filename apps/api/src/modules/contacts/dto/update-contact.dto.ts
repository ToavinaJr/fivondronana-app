import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  responsibility?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  groupLabel?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(250)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(250)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn(['INTERNAL', 'EXTERNAL'])
  kind?: 'INTERNAL' | 'EXTERNAL';
}
