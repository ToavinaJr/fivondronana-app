import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Email address or telephone number.' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(320)
  identifier!: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  password!: string;

  @ApiProperty({ required: false, description: 'Keep this session active for up to 30 days.' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
