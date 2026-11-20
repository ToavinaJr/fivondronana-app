import { IsBoolean } from 'class-validator';

export class SetConversationActiveDto {
  @IsBoolean() isActive!: boolean;
}
