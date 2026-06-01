import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseEntity } from '../entities/base.entity';

/**
 * Helper function to retrieve keys of BaseEntity in a type-safe manner.
 * Helps prevent hardcoded property strings.
 *
 * @param key - The key of the BaseEntity
 * @returns The key itself as a string
 */
const getBaseKey = <K extends keyof BaseEntity>(key: K): K => key;

/**
 * Standard sort direction order options.
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Base pagination query parameters containing page, limit, sort field, and direction.
 */
export class PaginationQueryDto<T extends string = string> {
  /**
   * Field to sort records by.
   */
  @ApiPropertyOptional({
    description: 'Field to sort records by',
    default: getBaseKey('created_at'),
  })
  @IsOptional()
  @IsString()
  sortBy?: T = getBaseKey('created_at') as unknown as T;

  /**
   * Sort direction order (ASC or DESC).
   * @example 'DESC'
   */
  @ApiPropertyOptional({
    description: 'Sort direction order (ASC or DESC)',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  /**
   * Page number for pagination. Defaults to 1.
   * @example 1
   */
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * The limit of records returned per page. Defaults to 10.
   * @example 10
   */
  @ApiPropertyOptional({
    description: 'Number of records per page',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

/**
 * Base paginated response metadata containing total, page, and limit properties.
 */
export class PaginatedResultDto {
  /**
   * Total number of records matching the query.
   * @example 100
   */
  @ApiProperty({
    description: 'Total number of records matching the query',
    example: 100,
  })
  total: number;

  /**
   * The current page number.
   * @example 1
   */
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  /**
   * The limit of items per page.
   * @example 10
   */
  @ApiProperty({
    description: 'Limit of items per page',
    example: 10,
  })
  limit: number;
}
