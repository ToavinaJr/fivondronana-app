import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CvBranchInputDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  group!: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  project?: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  @ValidateIf((_object, value) => value !== '' && value !== null && value !== undefined)
  @IsDateString({ strict: true, strictSeparator: true })
  startedAt?: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  @ValidateIf((_object, value) => value !== '' && value !== null && value !== undefined)
  @IsDateString({ strict: true, strictSeparator: true })
  endedAt?: string | null;
}

export class CvActivityInputDto {
  @ApiPropertyOptional({ maxLength: 160, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string | null;

  @ApiPropertyOptional({ maxLength: 160, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  responsibility?: string | null;

  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  @ValidateIf((_object, value) => value !== '' && value !== null && value !== undefined)
  @IsDateString({ strict: true, strictSeparator: true })
  date?: string | null;
}

export class CvExtraFieldInputDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  label!: string;

  @ApiProperty({ maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(300)
  value!: string;
}

export class CvInputDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(500)
  address!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true, strictSeparator: true })
  birthDate!: string;

  @ApiPropertyOptional({ maxLength: 160, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  birthPlace?: string | null;

  @ApiProperty({ maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(40)
  phone!: string;

  @ApiProperty({ format: 'email', maxLength: 320 })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiPropertyOptional({ maxLength: 300, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  facebook?: string | null;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(160)
  province!: string;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(160)
  area!: string;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(160)
  fivondronana!: string;

  @ApiPropertyOptional({ type: CvExtraFieldInputDto, isArray: true, maxItems: 100 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CvExtraFieldInputDto)
  extraPersonal?: CvExtraFieldInputDto[];

  @ApiPropertyOptional({ type: CvExtraFieldInputDto, isArray: true, maxItems: 100 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CvExtraFieldInputDto)
  extraContact?: CvExtraFieldInputDto[];

  @ApiPropertyOptional({ type: CvBranchInputDto, isArray: true, maxItems: 100 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CvBranchInputDto)
  branches?: CvBranchInputDto[];

  @ApiPropertyOptional({ type: CvActivityInputDto, isArray: true, maxItems: 100 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CvActivityInputDto)
  activities?: CvActivityInputDto[];
}
