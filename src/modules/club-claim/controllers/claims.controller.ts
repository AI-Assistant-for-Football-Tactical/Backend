import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { SubmitClaimDto } from '../dto/submit-claim.dto';
import { ClaimStatusResponseDto } from '../dto/claim-response.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TeamRole } from '../../../common/enums/team-role.enum';
import { RequireTeamRole } from '../../../common/decorators/roles.decorator';
import { ClubClaimService } from '../club-claim.service';
import type { AccessTokenPayload } from '../../auth/constants/token-payload.type';

/**
 * Handles club ownership claim operations for authenticated regular users.
 * Routes are protected by JwtAuthGuard + RolesGuard (applied globally via app setup).
 */
@ApiTags('Claims')
@ApiBearerAuth()
@Controller('claims')
@RequireTeamRole(TeamRole.NONE)
export class ClaimsController {
  constructor(private readonly clubClaimService: ClubClaimService) {}

  /**
   * Submit a new club ownership claim.
   *
   * @param user - Authenticated user from JWT
   * @param dto  - Claim payload (sofa_score_team_id, club_name, documents)
   * @returns    Created claim status
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a new club ownership claim' })
  @ApiCreatedResponse({
    description: 'Claim submitted successfully.',
    type: ClaimStatusResponseDto,
  })
  @ApiConflictResponse({
    description: 'User already has an active claim, or club already claimed.',
  })
  async submitClaim(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SubmitClaimDto,
  ): Promise<ClaimStatusResponseDto> {
    return this.clubClaimService.submitClaim(user, dto);
  }

  /**
   * Retrieve the authenticated user's current claim status.
   *
   * @param user - Authenticated user from JWT
   * @returns    The user's latest claim
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retrieve the current user's claim status" })
  @ApiOkResponse({
    description: 'Claim found.',
    type: ClaimStatusResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No claim found for this user.' })
  async getMyRecentClaim(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ClaimStatusResponseDto> {
    return this.clubClaimService.getMyRecentClaim(user);
  }

  /**
   * Cancel the user's current PENDING claim.
   *
   * @param user - Authenticated user from JWT
   */
  @Post('cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a pending or under-review claim' })
  @ApiNoContentResponse({ description: 'Claim cancelled successfully.' })
  @ApiNotFoundResponse({ description: 'No claim found.' })
  @ApiBadRequestResponse({
    description: 'Claim is in a terminal state and cannot be cancelled.',
  })
  async cancelMyRecentClaim(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    return this.clubClaimService.cancelMyRecentClaim(user);
  }
}
