import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination.js';

export class ContactQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['INTERNAL', 'EXTERNAL'])
  kind?: 'INTERNAL' | 'EXTERNAL';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
