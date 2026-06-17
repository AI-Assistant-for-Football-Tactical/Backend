import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClaimStatus } from '../../../common/enums/claim-status.enum';
import { Claim } from '../entities/claim.entity';

/**
 * Lightweight claim response for the submitting user (excludes sensitive reviewer data).
 */
export class ClaimStatusResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: '12345' })
  sofa_score_team_id: string;

  @ApiProperty({ example: 'Al Ahly SC' })
  club_name: string;

  @ApiProperty({ enum: ClaimStatus, example: ClaimStatus.PENDING })
  status: ClaimStatus;

  @ApiPropertyOptional({ example: 'Missing valid proof of ownership.' })
  rejection_reason: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-02T00:00:00.000Z' })
  updated_at: Date;

  @ApiProperty({
    example: ['http://example.com/doc.pdf', 'http://example.com/doc.pdf'],
  })
  document_urls: string[];

  /**
   * Maps a Claim entity to a ClaimStatusResponseDto.
   *
   * @param claim - The Claim entity to map
   * @returns Mapped ClaimStatusResponseDto
   */
  static fromEntity(claim: Claim): ClaimStatusResponseDto {
    const dto = new ClaimStatusResponseDto();
    dto.id = claim.id;
    dto.sofa_score_team_id = claim.sofa_score_team_id;
    dto.club_name = claim.club_name;
    dto.status = claim.status;
    dto.rejection_reason = claim.rejection_reason;
    dto.created_at = claim.created_at;
    dto.updated_at = claim.updated_at;
    return dto;
  }
}

/**
 * Detailed claim response for admins, including verification documents and reviewer info.
 */
export class AdminClaimDetailResponseDto extends ClaimStatusResponseDto {
  @ApiProperty({ type: [String] })
  document_urls: string[];

  @ApiPropertyOptional()
  justification: string | null;

  @ApiPropertyOptional({ example: 'uuid-of-reviewer' })
  reviewer_id: string | null;

  @ApiPropertyOptional({ example: '2024-01-02T00:00:00.000Z' })
  reviewed_at: Date | null;

  @ApiProperty({ example: 'uuid-of-user' })
  user_id: string;

  /**
   * Maps a Claim entity to an AdminClaimDetailResponseDto.
   *
   * @param claim - The Claim entity to map
   * @returns Mapped AdminClaimDetailResponseDto
   */
  static fromEntity(claim: Claim): AdminClaimDetailResponseDto {
    const dto = new AdminClaimDetailResponseDto();
    dto.id = claim.id;
    dto.sofa_score_team_id = claim.sofa_score_team_id;
    dto.club_name = claim.club_name;
    dto.status = claim.status;
    dto.rejection_reason = claim.rejection_reason;
    dto.created_at = claim.created_at;
    dto.updated_at = claim.updated_at;
    dto.document_urls = claim.document_urls;
    dto.justification = claim.justification;
    dto.reviewer_id = claim.reviewer_id;
    dto.reviewed_at = claim.reviewed_at;
    dto.user_id = claim.user_id;
    return dto;
  }
}

/**
 * Paginated list of claims response.
 */
export class PaginatedClaimsResponseDto {
  @ApiProperty({ type: [AdminClaimDetailResponseDto] })
  claims: AdminClaimDetailResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
export { ClaimStatus };
