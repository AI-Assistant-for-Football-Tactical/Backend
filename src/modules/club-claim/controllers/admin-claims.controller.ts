import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { RequireSystemRole } from '../../../common/decorators/roles.decorator';
import { SystemRole } from '../../../common/enums/system-role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ReviewClaimDto } from '../dto/review-claim.dto';
import { ClaimSearchQueryDto } from '../dto/claim-search-query.dto';
import {
  AdminClaimDetailResponseDto,
  PaginatedClaimsResponseDto,
} from '../dto/claim-response.dto';
import { ClubClaimService } from '../club-claim.service';
import type { AccessTokenPayload } from '../../auth/constants/token-payload.type';

/**
 * Admin controller for claims oversight.
 * All routes require ADMIN or SUPER_ADMIN system role.
 */
@ApiTags('Admin — Claims')
@ApiBearerAuth()
@Controller('admin/claims')
@RequireSystemRole(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)
export class AdminClaimsController {
  constructor(private readonly clubClaimService: ClubClaimService) {}

  /**
   * List all claims with optional status filter and pagination.
   *
   * @param query - Pagination and optional status filter
   * @returns Paginated claims list
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paginated list of all club ownership claims' })
  @ApiOkResponse({ type: PaginatedClaimsResponseDto })
  async listClaims(
    @Query() query: ClaimSearchQueryDto,
  ): Promise<PaginatedClaimsResponseDto> {
    return this.clubClaimService.listClaims(query);
  }

  /**
   * Get detailed view of a specific claim including verification documents.
   *
   * @param id - UUID of the claim
   * @returns  Full claim detail including document_urls and reviewer info
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detailed view of a single claim (includes document_urls)',
  })
  @ApiOkResponse({ type: AdminClaimDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Claim not found.' })
  async getClaimDetail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminClaimDetailResponseDto> {
    return this.clubClaimService.getClaimDetail(id);
  }

  /**
   * Review a claim: APPROVE (ACID transaction) or REJECT.
   *
   * APPROVE atomically:
   *  (a) marks claim APPROVED
   *  (b) creates the Club
   *  (c) elevates claimant to OWNER
   *  (d) revokes pending invitations for the user
   *
   * @param id       - UUID of the claim
   * @param reviewer - Authenticated admin from JWT
   * @param dto      - Review action and optional feedback
   */
  @Post(':id/review')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Review a claim: APPROVE or REJECT (APPROVE is transactional)',
  })
  @ApiNoContentResponse({ description: 'Claim reviewed successfully.' })
  @ApiNotFoundResponse({ description: 'Claim not found.' })
  @ApiBadRequestResponse({ description: 'Claim is not in a reviewable state.' })
  @ApiConflictResponse({
    description: 'Claimant already belongs to a club (APPROVE only).',
  })
  async reviewClaim(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() reviewer: AccessTokenPayload,
    @Body() dto: ReviewClaimDto,
  ): Promise<void> {
    return this.clubClaimService.reviewClaim(reviewer, id, dto);
  }
}
