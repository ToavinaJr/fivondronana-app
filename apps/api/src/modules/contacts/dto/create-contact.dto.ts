import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  responsibility!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  groupLabel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(250)
  address!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  phone!: string;

  @IsEmail()
  @MaxLength(250)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  description!: string;

  @IsIn(['INTERNAL', 'EXTERNAL'])
  kind!: 'INTERNAL' | 'EXTERNAL';
}
