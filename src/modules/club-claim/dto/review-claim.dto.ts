import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ClaimReviewAction } from '../enums/claim-review-action.enum';

/**
 * DTO for reviewing a club ownership claim (Admin only).
 *
 * @field action   - APPROVE or REJECT
 * @field feedback - Optional admin feedback / rejection reason
 */
export class ReviewClaimDto {
  @ApiProperty({
    description: 'The review decision',
    enum: ClaimReviewAction,
    example: ClaimReviewAction.APPROVE,
  })
  @IsEnum(ClaimReviewAction)
  action: ClaimReviewAction;

  @ApiProperty({
    description: 'Optional feedback or rejection reason',
    required: false,
    example: 'Documents are insufficient to verify ownership.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedback?: string;
}
