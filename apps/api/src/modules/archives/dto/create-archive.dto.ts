import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateArchiveDto {
  @IsString() @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsString() @MaxLength(80) category!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2200) year?: number;
}
