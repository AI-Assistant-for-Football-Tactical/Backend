import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

import { Invitation } from './entities/invitation.entity';
import { User } from '../user/entities/user.entity';
import { InvitationRepository } from './repositories/invitation.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { ClubRepository } from '../club/repositories/club.repository';
import { InvitationStatus } from './constants/invitation-status.enum';
import { TeamRole } from '../../common/enums/team-role.enum';
import { InvitationRespondAction } from './constants/invitation-respond-action.enum';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RespondToInvitationDto } from './dto/respond-invitation.dto';
import { InvitationSearchQueryDto } from './dto/invitation-search-query.dto';
import {
  UserPendingInvitationResponseDto,
  ClubSentInvitationResponseDto,
  AdminInvitationResponseDto,
  PaginatedAdminInvitationsResponseDto,
} from './dto/invitation-response.dto';
import {
  InvitationEvents,
  UserInvitedEvent,
} from '../../common/events/invitation.events';
import { AppConfig } from '../../core/config';
import type { AccessTokenPayload } from '../auth/constants/token-payload.type';

/**
 * Service handling all operations regarding invitations.
 */
@Injectable()
export class InvitationService {
  /**
   * Constructs the InvitationService.
   *
   * @param invitationRepository Custom repository for Invitation
   * @param userRepository Custom repository for User
   * @param clubRepository Custom repository for Club
   * @param dataSource TypeORM DataSource for transaction management
   * @param eventEmitter NestJS EventEmitter2
   * @param appConfig Configuration service for base URLs
   */
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly userRepository: UserRepository,
    private readonly clubRepository: ClubRepository,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly appConfig: AppConfig,
  ) {}

  /**
   * Creates a new pending invitation for a user to join a club.
   *
   * @param manager The authenticated user sending the invitation (must be a MANAGER/OWNER)
   * @param dto The payload containing targetEmail
   * @returns Mapped AdminInvitationResponseDto containing details of the created invitation
   * @throws BadRequestException If the manager does not belong to a club
   * @throws NotFoundException If the target user does not exist
   * @throws ConflictException If target user is already in a club, or already has an active pending invitation from this club
   */
  async createInvitation(
    manager: AccessTokenPayload,
    dto: CreateInvitationDto,
  ): Promise<AdminInvitationResponseDto> {
    if (!manager.club_id) {
      throw new BadRequestException(
        'Manager must belong to a club to invite members',
      );
    }

    // 1. Ensure target user exists
    const targetUser = await this.userRepository.findActiveByEmail(
      dto.targetEmail,
    );

    if (!targetUser) {
      throw new NotFoundException(
        `User with email ${dto.targetEmail} not found`,
      );
    }

    // 2. Ensure target user has NONE role
    if (targetUser.member_role !== TeamRole.NONE) {
      throw new ConflictException('Target user already belongs to a club');
    }

    // 3. Ensure target user isn't already invited by this club
    const hasActiveInvite =
      await this.invitationRepository.hasActivePendingInvite(
        targetUser.id,
        manager.club_id,
      );

    if (hasActiveInvite) {
      throw new ConflictException(
        'This user has already been invited by your club',
      );
    }

    // Fetch the club to get the club name for the event using ClubRepository
    const club = await this.clubRepository.findNotDeletedById(manager.club_id);
    const clubName = club?.name || 'our club';

    // 4. Generate token and expiration date (7 days from now)
    const { rawToken, expiresAt } = this.generateInvitationToken();
    const hashedToken = this.invitationRepository.hashToken(rawToken);

    // 5. Create PENDING invite
    const savedInvitation =
      await this.invitationRepository.createPendingInvitation({
        token: hashedToken,
        clubId: manager.club_id,
        fromUserId: manager.id,
        toUserId: targetUser.id,
        toEmail: targetUser.email,
        expiresAt,
        role: TeamRole.STAFF,
      });

    // 6. Generate direct action URL and emit UserInvitedEvent using helper method
    this.emitInvitationEvent(
      savedInvitation,
      targetUser.email,
      clubName,
      rawToken,
    );

    return AdminInvitationResponseDto.fromEntity(savedInvitation);
  }

  /**
   * Lists active pending invites sent by the manager's club.
   *
   * @param manager The authenticated user requesting the list
   * @returns Array of active pending invitations for the club manager
   * @throws BadRequestException If the manager does not belong to a club
   */
  async listActivePendingInvites(
    manager: AccessTokenPayload,
  ): Promise<ClubSentInvitationResponseDto[]> {
    if (!manager.club_id) {
      throw new BadRequestException(
        'Manager must belong to a club to view invitations',
      );
    }

    const invites =
      await this.invitationRepository.findActivePendingInvitesByClub(
        manager.club_id,
      );

    return invites.map((invite) =>
      ClubSentInvitationResponseDto.fromEntity(invite),
    );
  }

  /**
   * Sets a pending invite sent by the manager's club to REVOKED.
   *
   * @param manager The authenticated user executing the cancellation
   * @param inviteId UUID of the invitation to cancel
   * @throws BadRequestException If the manager does not belong to a club
   * @throws NotFoundException If the invitation does not exist
   * @throws ForbiddenException If the invitation belongs to another club
   * @throws ConflictException If the invitation is not in a pending state
   */
  async cancelInvite(
    manager: AccessTokenPayload,
    inviteId: string,
  ): Promise<void> {
    if (!manager.club_id) {
      throw new BadRequestException(
        'Manager must belong to a club to cancel invitations',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invite = await queryRunner.manager.findOne(Invitation, {
        where: { id: inviteId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!invite) {
        throw new NotFoundException('Invitation not found');
      }

      if (invite.club_id !== manager.club_id) {
        throw new ForbiddenException(
          'You cannot cancel invitations for another club',
        );
      }

      if (invite.status !== InvitationStatus.PENDING) {
        throw new ConflictException(
          `Invitation cannot be cancelled because its status is ${invite.status}`,
        );
      }

      invite.status = InvitationStatus.REVOKED;
      invite.status_changed_at = new Date();

      await queryRunner.manager.save(Invitation, invite);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lists all PENDING invites for the authenticated user.
   *
   * @param user The authenticated user requesting their invites
   * @returns Array of pending invites for the user with club and inviter info
   */
  async listMyPendingInvites(
    user: AccessTokenPayload,
  ): Promise<UserPendingInvitationResponseDto[]> {
    const invites =
      await this.invitationRepository.findActivePendingInvitesForUser(user.id);

    return invites.map((invite) =>
      UserPendingInvitationResponseDto.fromEntity(invite),
    );
  }

  /**
   * Responds to a club invitation (Accept / Reject).
   *
   * @param user The authenticated user responding to the invitation
   * @param inviteId The UUID of the invitation
   * @param dto RespondToInvitationDto payload containing the action
   * @returns Mapped AdminInvitationResponseDto containing details of the updated invitation
   * @throws NotFoundException If invitation is not found
   * @throws ForbiddenException If the invitation does not belong to this user
   * @throws ConflictException If invitation is not in a PENDING state, or has expired
   */
  async respondToInvitation(
    user: AccessTokenPayload,
    inviteId: string,
    dto: RespondToInvitationDto,
  ): Promise<AdminInvitationResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let committed = false;

    try {
      const invite = await queryRunner.manager.findOne(Invitation, {
        where: { id: inviteId },
        relations: ['club', 'from_user', 'to_user'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!invite) {
        throw new NotFoundException('Invitation not found');
      }

      if (invite.to_user_id !== user.id) {
        throw new ForbiddenException(
          'You are not authorized to respond to this invitation',
        );
      }

      if (invite.status !== InvitationStatus.PENDING) {
        throw new ConflictException(
          `Invitation cannot be responded to because its status is ${invite.status}`,
        );
      }

      if (invite.expires_at < new Date()) {
        invite.status = InvitationStatus.EXPIRED;
        invite.status_changed_at = new Date();
        await queryRunner.manager.save(Invitation, invite);
        await queryRunner.commitTransaction();
        committed = true;
        throw new ConflictException('This invitation has expired');
      }

      if (dto.action === InvitationRespondAction.REJECT) {
        invite.status = InvitationStatus.REJECTED;
        invite.status_changed_at = new Date();
        const updatedInvite = await queryRunner.manager.save(
          Invitation,
          invite,
        );
        await queryRunner.commitTransaction();
        committed = true;
        return AdminInvitationResponseDto.fromEntity(updatedInvite);
      }

      // 1. Lock the user row
      const targetUser = await queryRunner.manager.findOne(User, {
        where: { id: user.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!targetUser) {
        throw new NotFoundException('User record not found');
      }

      // Double check user role and club association inside the transaction lock
      if (
        targetUser.member_role !== TeamRole.NONE ||
        targetUser.club_id !== null
      ) {
        throw new ConflictException('You already belong to a club');
      }

      // 2. Update invite to ACCEPTED
      invite.status = InvitationStatus.ACCEPTED;
      invite.status_changed_at = new Date();
      await queryRunner.manager.save(Invitation, invite);

      // 3. Update user role to STAFF and clubId to the invite's club
      targetUser.member_role = TeamRole.STAFF;
      targetUser.club_id = invite.club_id;
      await queryRunner.manager.save(User, targetUser);

      // 4. Update all other PENDING invites for this user to EXPIRED
      await queryRunner.manager.update(
        Invitation,
        {
          to_user_id: targetUser.id,
          status: InvitationStatus.PENDING,
        },
        {
          status: InvitationStatus.EXPIRED,
          status_changed_at: new Date(),
        },
      );

      // 5. Commit
      await queryRunner.commitTransaction();
      committed = true;

      return AdminInvitationResponseDto.fromEntity(invite);
    } catch (error) {
      if (!committed) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Paginated and filterable search for all invites across the system (Admin only).
   *
   * @param query InvitationSearchQueryDto containing filters and pagination options
   * @returns Paginated list of invitations
   */
  async listAllInvitesForAdmin(
    query: InvitationSearchQueryDto,
  ): Promise<PaginatedAdminInvitationsResponseDto> {
    const { page = 1, limit = 10 } = query;
    const [invitations, total] =
      await this.invitationRepository.searchForAdmin(query);

    const mappedInvitations = invitations.map((invite) =>
      AdminInvitationResponseDto.fromEntity(invite),
    );

    const response = new PaginatedAdminInvitationsResponseDto();
    response.invitations = mappedInvitations;
    response.total = total;
    response.page = page;
    response.limit = limit;

    return response;
  }

  /**
   * Generates a type-safe unique invitation token and sets expiration date to 7 days from now.
   *
   * @returns Object containing the generated hex tokens (raw and hashed) and expiresAt date
   */
  private generateInvitationToken(): {
    rawToken: string;
    expiresAt: Date;
  } {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return { rawToken, expiresAt };
  }

  /**
   * Builds the action URL and emits the USER_INVITED event to notify the invitee.
   *
   * @param invitation The saved invitation entity
   * @param targetEmail The email of the target user
   * @param clubName The name of the inviting club
   * @param rawToken The raw invitation token
   */
  private emitInvitationEvent(
    invitation: Invitation,
    targetEmail: string,
    clubName: string,
    rawToken: string,
  ): void {
    const baseUrl = this.appConfig.baseUrl;
    const api = this.appConfig.apiPrefix;
    const actionUrl = `${baseUrl}/${api}/invites/${invitation.id}/respond?token=${rawToken}`;

    this.eventEmitter.emit(InvitationEvents.USER_INVITED, {
      email: targetEmail,
      actionUrl,
      clubName,
      clubId: invitation.club_id,
    } as UserInvitedEvent);
  }
}
