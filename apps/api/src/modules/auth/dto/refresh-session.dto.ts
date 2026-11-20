import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshSessionDto {
  @ApiProperty({ minLength: 40, maxLength: 128 })
  @IsString()
  @MinLength(40)
  @MaxLength(128)
  refreshToken!: string;
}
