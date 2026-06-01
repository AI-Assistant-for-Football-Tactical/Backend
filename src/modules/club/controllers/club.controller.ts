import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { RequireTeamRole } from '../../../common/decorators/roles.decorator';
import { TeamRole } from '../../../common/enums/team-role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SuccessionDto, ClubResponseDto } from '../dto/club-governance.dto';
import { ClubService } from '../club.service';
import type { AccessTokenPayload } from '../../auth/constants/token-payload.type';

/**
 * Club governance controller for OWNER and STAFF members.
 * Handles viewing club info, leaving, and ownership succession.
 */
@ApiTags('Club Governance')
@ApiBearerAuth()
@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  /**
   * Returns the details of the club attached to the authenticated user's JWT.
   *
   * @param user - Authenticated user from JWT (must be OWNER or STAFF)
   * @returns    The club details
   */
  @Get('mine')
  @RequireTeamRole(TeamRole.OWNER, TeamRole.STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the authenticated user's club details" })
  @ApiOkResponse({ type: ClubResponseDto })
  @ApiNotFoundResponse({ description: 'User is not associated with any club.' })
  async getMyClub(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ClubResponseDto> {
    return this.clubService.getMyClub(user);
  }

  /**
   * Leave the club.
   * - STAFF: unlinks from club immediately.
   * - OWNER with no staff: triggers club soft-delete.
   * - OWNER with staff: blocked; must perform succession first.
   *
   * @param user - Authenticated user from JWT
   */
  @Post('leave')
  @RequireTeamRole(TeamRole.OWNER, TeamRole.STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Leave the club (STAFF unlinks; lone OWNER dissolves club)',
  })
  @ApiNoContentResponse({ description: 'Left club successfully.' })
  @ApiForbiddenResponse({
    description: 'OWNER with remaining staff must perform succession first.',
  })
  @ApiNotFoundResponse({ description: 'User is not associated with any club.' })
  async leaveClub(@CurrentUser() user: AccessTokenPayload): Promise<void> {
    return this.clubService.leaveClub(user);
  }

  /**
   * Transfer ownership to a STAFF member (OWNER only).
   * Atomically swaps roles: target becomes OWNER, requester becomes STAFF.
   *
   * @param user - Authenticated OWNER from JWT
   * @param dto  - Succession payload with targetUserId
   */
  @Post('succession')
  @RequireTeamRole(TeamRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Transfer club ownership to a STAFF member (OWNER only)',
  })
  @ApiNoContentResponse({ description: 'Succession completed successfully.' })
  @ApiNotFoundResponse({
    description: 'Target user not found or user not in a club.',
  })
  @ApiBadRequestResponse({
    description: 'Target user is not a STAFF member of this club.',
  })
  async succession(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SuccessionDto,
  ): Promise<void> {
    return this.clubService.succession(user, dto.targetUserId);
  }
}
