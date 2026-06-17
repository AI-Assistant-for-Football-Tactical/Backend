import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  SystemRole,
  isRoleHigherThan,
} from '../../common/enums/system-role.enum';
import { PromoteUserDto } from './dtos/promote-user.dto';
import { ClaimSearchQueryDto } from './dtos/claim-search-query.dto';
import { RevokeTokensByAdminDto } from './dtos/revoke-tokens.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRepository } from '../user/repositories/user.repository';
import { ClaimRepository } from '../club-claim/repositories/claim.repository';
import { ClubRepository } from '../club/repositories/club.repository';
import { Claim } from '../club-claim/entities/claim.entity';
import { Club } from '../club/entities/club.entity';
import { AuthToken } from '../auth/entities/token.entity';
import { AuthTokenType } from '../auth/constants/auth-token-type.enum';
import type { AccessTokenPayload } from '../auth/constants/token-payload.type';
import { SecurityEvents } from '../../common/events/security.events';
import { UserService } from '../user/user.service';
import { UserSearchQueryDto } from '../user/dto/user-search.dto';
import { updateSecurityActionTime } from '../auth/helpers/security.helper';

/**
 * Service handling administrative operations including user management,
 * role promotion, and system-wide search.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly claimRepository: ClaimRepository,
    private readonly clubRepository: ClubRepository,
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Promotes a user to a new system role based on the requester's hierarchy.
   *
   * @param requester - The authenticated user performing the promotion.
   * @param targetUserId - The UUID of the user to be promoted.
   * @param dto - Data containing the new role.
   * @returns A promise that resolves when promotion is complete.
   * @throws ForbiddenException if the promotion violates the role hierarchy or is a self-upgrade.
   * @throws NotFoundException if the target user does not exist.
   */
  async promoteUser(
    requester: AccessTokenPayload,
    targetUserId: string,
    dto: PromoteUserDto,
  ): Promise<void> {
    const targetUser = await this.userRepository.internalRepo.findOne({
      where: { id: targetUserId },
      select: { id: true, system_role: true },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID ${targetUserId} not found.`);
    }

    // 1. Hierarchy Validation
    if (requester.id === targetUserId) {
      // Self-promotion checks: can downgrade, but not upgrade
      if (isRoleHigherThan(dto.role, targetUser.system_role)) {
        throw new ForbiddenException(
          'You cannot upgrade your own system role.',
        );
      }
    } else {
      // Modifying another user
      if (isRoleHigherThan(targetUser.system_role, requester.sys_role)) {
        throw new ForbiddenException(
          'You cannot modify a user with a higher system role.',
        );
      }

      if (requester.sys_role === SystemRole.ADMIN) {
        if (
          dto.role === SystemRole.ADMIN ||
          dto.role === SystemRole.SUPER_ADMIN
        ) {
          // Emit security violation event to notify SUPER_ADMINs
          this.eventEmitter.emit(SecurityEvents.ADMIN_SECURITY_VIOLATION, {
            requesterId: requester.id,
            targetUserId,
            attemptedRole: dto.role,
            action: 'ROLE_PROMOTION_OVERREACH',
          });

          throw new ForbiddenException(
            'Admins can only promote users to REVIEWER role. Promotion to ADMIN or SUPER_ADMIN is restricted to Super Admins.',
          );
        }
      }
    }

    // 2. Perform raw update to bypass class-validator hooks on the entity
    await this.userRepository.internalRepo.update(targetUserId, {
      system_role: dto.role,
      last_security_action_at: updateSecurityActionTime(),
    });

    // 3. Emit success event for audit logging/notifications
    this.eventEmitter.emit(SecurityEvents.ADMIN_USER_PROMOTED, {
      targetUserId,
      newRole: dto.role,
      adminId: requester.id,
    });
  }

  /**
   * Searches for club ownership claims based on status with pagination.
   *
   * @param query - The search filters and pagination parameters.
   */
  async searchClaims(query: ClaimSearchQueryDto): Promise<{
    claims: Claim[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, page, limit } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.claimRepository.internalRepo
      .createQueryBuilder('claim')
      .leftJoinAndSelect('claim.user', 'user')
      .select([
        'claim.id',
        'claim.club_name',
        'claim.sofa_score_team_id',
        'claim.status',
        'claim.created_at',
        'user.id',
        'user.email',
      ]);

    if (status) {
      queryBuilder.andWhere('claim.status = :status', { status });
    }

    const [claims, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('claim.created_at', 'DESC')
      .getManyAndCount();

    return {
      claims,
      total,
      page,
      limit,
    };
  }

  /**
   * Searches for clubs (Teams foundation) with pagination.
   *
   * @param dto - Pagination parameters and name filter.
   */
  async searchClubs(dto: ClaimSearchQueryDto): Promise<{
    clubs: Club[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (dto.page - 1) * dto.limit;

    const queryBuilder = this.clubRepository.internalRepo
      .createQueryBuilder('club')
      .select(['club.id', 'club.name', 'club.status', 'club.created_at']);

    const [clubs, total] = await queryBuilder
      .skip(skip)
      .take(dto.limit)
      .orderBy('club.created_at', 'DESC')
      .getManyAndCount();

    return {
      clubs,
      total,
      page: dto.page,
      limit: dto.limit,
    };
  }

  async searchUsers(query: UserSearchQueryDto) {
    return this.userService.searchUsers(query);
  }

  /**
   * Revokes all active refresh tokens in a given time slot.
   * If no boundaries are provided, all active refresh tokens in the system are deleted.
   *
   * @param dto - Optional time slot boundaries.
   * @returns A promise that resolves when the revocation is complete.
   */
  async revokeRefreshTokens(dto: RevokeTokensByAdminDto): Promise<void> {
    const queryBuilder = this.dataSource
      .getRepository(AuthToken)
      .createQueryBuilder('token')
      .delete()
      .where('type = :type', { type: AuthTokenType.REFRESH });

    if (dto.startDate) {
      queryBuilder.andWhere('created_at >= :startDate', {
        startDate: new Date(dto.startDate),
      });
    }

    if (dto.endDate) {
      queryBuilder.andWhere('created_at <= :endDate', {
        endDate: new Date(dto.endDate),
      });
    }

    await queryBuilder.execute();
  }
}
