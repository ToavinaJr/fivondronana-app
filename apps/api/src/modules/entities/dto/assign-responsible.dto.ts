import { IsString, MaxLength, MinLength } from 'class-validator';

export class AssignResponsibleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  userId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  entityId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  groupId!: string;
}
