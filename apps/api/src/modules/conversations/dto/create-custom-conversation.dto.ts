import { IsArray, IsString, MaxLength } from 'class-validator';

export class CreateCustomConversationDto {
  @IsString() @MaxLength(160) title!: string;
  @IsArray() @IsString({ each: true }) entityIds!: string[];
  @IsArray() @IsString({ each: true }) memberUserIds!: string[];
}
