import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_PAGE_NUMBER = Math.floor(Number.MAX_SAFE_INTEGER / MAX_PAGE_SIZE);

export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_NUMBER, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_NUMBER)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize = DEFAULT_PAGE_SIZE;
}

export type PaginationMetadata = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMetadata;
};

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  query: Pick<PaginationQueryDto, 'page' | 'pageSize'>,
): PaginatedResponse<T> {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new RangeError('Pagination total must be a non-negative safe integer.');
  }
  assertValidPaginationQuery(query);

  return {
    data,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    },
  };
}

export function getPaginationOffset(query: Pick<PaginationQueryDto, 'page' | 'pageSize'>): {
  skip: number;
  take: number;
} {
  assertValidPaginationQuery(query);
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

function assertValidPaginationQuery(query: Pick<PaginationQueryDto, 'page' | 'pageSize'>): void {
  if (!Number.isSafeInteger(query.page) || query.page < 1 || query.page > MAX_PAGE_NUMBER) {
    throw new RangeError(`Pagination page must be an integer between 1 and ${MAX_PAGE_NUMBER}.`);
  }
  if (!Number.isSafeInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > MAX_PAGE_SIZE) {
    throw new RangeError(`Pagination page size must be an integer between 1 and ${MAX_PAGE_SIZE}.`);
  }
  if (!Number.isSafeInteger((query.page - 1) * query.pageSize)) {
    throw new RangeError('Pagination offset exceeds the safe integer range.');
  }
}
