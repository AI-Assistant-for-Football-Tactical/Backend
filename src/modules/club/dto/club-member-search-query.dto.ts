import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import {
  PaginationQueryDto,
  SortOrder,
} from '../../../common/dtos/pagination.dto';

export enum ClubMemberSortField {
  FIRST_NAME = 'first_name',
  USERNAME = 'username',
  MEMBER_ROLE = 'member_role',
  CREATED_AT = 'created_at',
}

/**
 * Query DTO for club member listing.
 */
export class ClubMemberSearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Field to sort members by',
    enum: ClubMemberSortField,
    default: ClubMemberSortField.MEMBER_ROLE,
  })
  @IsOptional()
  @IsEnum(ClubMemberSortField)
  sortBy?: ClubMemberSortField = ClubMemberSortField.MEMBER_ROLE;

  @ApiPropertyOptional({
    description: 'Sort direction order (ASC or DESC)',
    enum: SortOrder,
    default: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}
