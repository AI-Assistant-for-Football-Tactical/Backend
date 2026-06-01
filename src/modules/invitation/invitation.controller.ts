import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RespondToInvitationDto } from './dto/respond-invitation.dto';
import {
  UserPendingInvitationResponseDto,
  ClubSentInvitationResponseDto,
  AdminInvitationResponseDto,
} from './dto/invitation-response.dto';
import { RequireTeamRole } from '../../common/decorators/roles.decorator';
import { TeamRole } from '../../common/enums/team-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/constants/token-payload.type';

/**
 * Controller handling invitation actions for both Managers/Owners and regular Users.
 * Encapsulates the HTTP transport layer and handles RBAC routing.
 */
@ApiTags('Invitations')
@ApiBearerAuth()
@Controller('invites')
export class InvitationController {
  /**
   * Constructs the InvitationController.
   *
   * @param invitationService Business logic service for invitations
   */
  constructor(private readonly invitationService: InvitationService) {}

  /**
   * Invite a user to join the club.
   *
   * @param user The authenticated manager/owner
   * @param dto Payload with targetEmail
   * @returns Mapped details of the created invitation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireTeamRole(TeamRole.OWNER)
  @ApiOperation({ summary: 'Invite a user to join the club (Manager only)' })
  @ApiCreatedResponse({
    description: 'Invitation created successfully.',
    type: AdminInvitationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Manager does not belong to a club.' })
  @ApiNotFoundResponse({ description: 'Target user not found.' })
  @ApiConflictResponse({
    description: 'Target user is already in a club, or already invited.',
  })
  async createInvitation(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateInvitationDto,
  ): Promise<AdminInvitationResponseDto> {
    return this.invitationService.createInvitation(user, dto);
  }

  /**
   * List active pending invites sent by the manager's club.
   *
   * @param user The authenticated manager/owner
   * @returns Array of active pending invites
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequireTeamRole(TeamRole.OWNER)
  @ApiOperation({
    summary:
      "List active pending invites sent by the manager's club (Manager only)",
  })
  @ApiOkResponse({
    description: 'Active pending invitations retrieved successfully.',
    type: [ClubSentInvitationResponseDto],
  })
  @ApiBadRequestResponse({ description: 'Manager does not belong to a club.' })
  async listActivePendingInvites(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ClubSentInvitationResponseDto[]> {
    return this.invitationService.listActivePendingInvites(user);
  }

  /**
   * List all PENDING invites for the authenticated user.
   *
   * @param user The authenticated user with no club role
   * @returns Array of pending invites for the user
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @RequireTeamRole(TeamRole.NONE)
  @ApiOperation({
    summary: 'List all pending invitations for the current user',
  })
  @ApiOkResponse({
    description: 'User invitations retrieved successfully.',
    type: [UserPendingInvitationResponseDto],
  })
  async listMyPendingInvites(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<UserPendingInvitationResponseDto[]> {
    return this.invitationService.listMyPendingInvites(user);
  }

  /**
   * Set a pending invite sent by the manager's club to REVOKED.
   *
   * @param user The authenticated manager/owner
   * @param id UUID of the invitation to cancel
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireTeamRole(TeamRole.OWNER)
  @ApiOperation({
    summary:
      "Cancel a pending invitation sent by the manager's club (Manager only)",
  })
  @ApiNoContentResponse({ description: 'Invitation cancelled successfully.' })
  @ApiNotFoundResponse({ description: 'Invitation not found.' })
  @ApiForbiddenResponse({ description: 'Invitation belongs to another club.' })
  @ApiBadRequestResponse({ description: 'Manager does not belong to a club.' })
  @ApiConflictResponse({ description: 'Invitation is not pending.' })
  async cancelInvite(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.invitationService.cancelInvite(user, id);
  }

  /**
   * Respond (Accept/Reject) to a club invitation.
   *
   * @param user The authenticated user
   * @param id UUID of the invitation
   * @param dto Payload with response action (ACCEPT or REJECT)
   * @returns Mapped details of the updated invitation
   */
  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  @RequireTeamRole(TeamRole.NONE)
  @ApiOperation({ summary: 'Respond (Accept or Reject) to a club invitation' })
  @ApiOkResponse({
    description: 'Invitation responded to successfully.',
    type: AdminInvitationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Invitation not found.' })
  @ApiForbiddenResponse({
    description: 'Invitation does not belong to the user.',
  })
  @ApiConflictResponse({
    description:
      'Invitation is not pending, has expired, or user already in a club.',
  })
  async respondToInvitation(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondToInvitationDto,
  ): Promise<AdminInvitationResponseDto> {
    return this.invitationService.respondToInvitation(user, id, dto);
  }
}
