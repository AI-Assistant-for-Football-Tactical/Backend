import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FavoriteTargetType } from '../../../common/enums/favorite-target-type.enum';
import { FavoriteResDto } from './favorite-res.dto';

/** Allowed fields for sorting user favorites */
export enum FavoriteSortField {
  CREATED_AT = 'created_at',
  TARGET_NAME = 'target_name',
}

/** Allowed sorting direction options */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Query DTO for retrieving user favorites with filters, sorting, and pagination.
 */
export class FavoriteSearchQueryDto {
  /** Filter favorites by target type (e.g. LEAGUE, TEAM, PLAYER) */
  @ApiPropertyOptional({
    description: 'Filter favorites by target type',
    enum: FavoriteTargetType,
  })
  @IsOptional()
  @IsEnum(FavoriteTargetType)
  type?: FavoriteTargetType;

  /** Filter favorites by target name (partial match, case-insensitive) */
  @ApiPropertyOptional({
    description:
      'Filter favorites by target name (partial match, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  target_name?: string;

  /** Field to sort favorites by (whitelisted options only) */
  @ApiPropertyOptional({
    description: 'Field to sort favorites by',
    enum: FavoriteSortField,
    default: FavoriteSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(FavoriteSortField)
  sortBy?: FavoriteSortField = FavoriteSortField.CREATED_AT;

  /** Sort direction order (ASC or DESC) */
  @ApiPropertyOptional({
    description: 'Sort direction order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  /** Page number for pagination */
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /** Number of records per page */
  @ApiPropertyOptional({
    description: 'Number of records per page',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;
}

/**
 * Paginated result DTO for user favorites.
 */
export class FavoriteSearchResultDto {
  /** The paginated list of favorites */
  @ApiProperty({
    description: 'List of user favorites',
    type: [FavoriteResDto],
  })
  favorites: FavoriteResDto[];

  /** Total number of favorites matching filters */
  @ApiProperty({ description: 'Total number of favorites matching filters' })
  total: number;

  /** Current page number */
  @ApiProperty({ description: 'Current page number' })
  page: number;

  /** Number of items per page */
  @ApiProperty({ description: 'Number of items per page' })
  limit: number;
}
