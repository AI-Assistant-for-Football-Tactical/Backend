import { IsOptional, IsEnum, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClaimStatus } from '../../../common/enums/claim-status.enum';

/**
 * Query DTO for searching and filtering club ownership claims.
 */
export class ClaimSearchQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by claim status',
    enum: ClaimStatus,
  })
  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus;

  @ApiPropertyOptional({
    description: 'Filter by ID of the admin/reviewer who reviewed the claim',
    example: 'a0b1c2d3-e4f5-6789-abcd-ef0123456789',
  })
  @IsOptional()
  @IsUUID()
  reviewer_id?: string;

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
