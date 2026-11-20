import { IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsString() @MaxLength(160) title!: string;
  @IsString() entityId!: string;
}
