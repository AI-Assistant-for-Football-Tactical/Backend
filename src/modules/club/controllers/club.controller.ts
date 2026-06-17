import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
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
  ApiParam,
} from '@nestjs/swagger';
import { RequireTeamRole } from '../../../common/decorators/roles.decorator';
import { TeamRole } from '../../../common/enums/team-role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ActiveClubGuard } from '../../../common/guards/active-club.guard';
import {
  SuccessionDto,
  RemoveMembersDto,
  ClubResponseDto,
  ClubMemberResponseDto,
  PaginatedClubMembersResponseDto,
} from '../dto/club-governance.dto';
import { ClubMemberSearchQueryDto } from '../dto/club-member-search-query.dto';
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
   * Returns active members of the authenticated user's club.
   *
   * @param user - Authenticated user from JWT (must be OWNER or STAFF)
   * @returns    Active members of the user's current club
   */
  @Get('members')
  @RequireTeamRole(TeamRole.OWNER, TeamRole.STAFF)
  @UseGuards(ActiveClubGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the authenticated user's club members" })
  @ApiOkResponse({ type: PaginatedClubMembersResponseDto })
  @ApiNotFoundResponse({ description: 'User is not associated with any club.' })
  async listMyClubMembers(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ClubMemberSearchQueryDto,
  ): Promise<PaginatedClubMembersResponseDto> {
    return this.clubService.listMyClubMembers(user, query);
  }

  /**
   * Returns a member of the authenticated user's club.
   *
   * @param user     - Authenticated user from JWT (must be OWNER or STAFF)
   * @param memberId - Club member UUID
   * @returns        Active club member details
   */
  @Get('members/:memberId')
  @RequireTeamRole(TeamRole.OWNER, TeamRole.STAFF)
  @UseGuards(ActiveClubGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a member of the authenticated user's club" })
  @ApiOkResponse({ type: ClubMemberResponseDto })
  @ApiNotFoundResponse({ description: 'Club member not found.' })
  async getMyClubMember(
    @CurrentUser() user: AccessTokenPayload,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<ClubMemberResponseDto> {
    return this.clubService.getMyClubMember(user, memberId);
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
  @UseGuards(ActiveClubGuard)
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
  @UseGuards(ActiveClubGuard)
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

  /**
   * Remove multiple STAFF members from the club (OWNER only).
   *
   * @param user - Authenticated OWNER from JWT
   * @param dto  - STAFF member UUIDs to remove from the club
   */
  @Delete('members')
  @RequireTeamRole(TeamRole.OWNER)
  @UseGuards(ActiveClubGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove multiple STAFF members from the club (OWNER only)',
  })
  @ApiNoContentResponse({ description: 'Members removed successfully.' })
  @ApiNotFoundResponse({
    description:
      'One or more target users not found, or owner is not in a club.',
  })
  @ApiBadRequestResponse({
    description: 'One or more target users are not removable STAFF members.',
  })
  @ApiForbiddenResponse({
    description: 'Only the club OWNER can remove members.',
  })
  async removeMembers(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: RemoveMembersDto,
  ): Promise<void> {
    return this.clubService.removeMembers(user, dto.memberIds);
  }

  /**
   * Remove a STAFF member from the club (OWNER only).
   *
   * @param user     - Authenticated OWNER from JWT
   * @param memberId - STAFF member UUID to remove from the club
   */
  @Delete('members/:memberId')
  @RequireTeamRole(TeamRole.OWNER)
  @UseGuards(ActiveClubGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a STAFF member from the club (OWNER only)',
  })
  @ApiParam({
    name: 'memberId',
    description: 'UUID of the STAFF member to remove from the club',
  })
  @ApiNoContentResponse({ description: 'Member removed successfully.' })
  @ApiNotFoundResponse({
    description: 'Target user not found or owner is not in a club.',
  })
  @ApiBadRequestResponse({
    description: 'Target user is not a removable STAFF member of this club.',
  })
  @ApiForbiddenResponse({
    description: 'Only the club OWNER can remove members.',
  })
  async removeMember(
    @CurrentUser() user: AccessTokenPayload,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<void> {
    return this.clubService.removeMember(user, memberId);
  }
}
