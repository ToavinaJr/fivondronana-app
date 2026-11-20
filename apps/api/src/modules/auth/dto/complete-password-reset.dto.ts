import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CompletePasswordResetDto {
  @ApiProperty({ minLength: 40, maxLength: 128 })
  @IsString()
  @MinLength(40)
  @MaxLength(128)
  token!: string;

  @ApiProperty({ minLength: 8, maxLength: 128, format: 'password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
