import { IsBoolean } from 'class-validator';

export class SetArchivePublishedDto {
  @IsBoolean() isPublished!: boolean;
}
