import { IsBoolean } from 'class-validator';

export class SetContactPublishedDto {
  @IsBoolean()
  isPublished!: boolean;
}
