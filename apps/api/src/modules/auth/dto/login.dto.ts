import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
