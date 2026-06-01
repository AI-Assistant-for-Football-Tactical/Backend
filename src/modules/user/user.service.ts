import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
  // Inject,
  // forwardRef,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { DataSource, In, Not } from 'typeorm';
import { AccountStatus } from '../../common/enums/account-status.enum';
import { TeamRole } from '../../common/enums/team-role.enum';
import { PinoLogger } from 'nestjs-pino';
import { ClubStatus } from '../club/constants/club-status.enum';
import { Club } from '../club/entities/club.entity';
import { UserRepository } from './repositories/user.repository';
import { FavoriteRepository } from './repositories/favorite.repository';
import { UserSortField } from './dto/user-search.dto';
import { SortOrder } from '../../common/dtos/pagination.dto';
import type {
  UserSearchQueryDto,
  UserSearchResultDto,
} from './dto/user-search.dto';
import { UserPublicProfileResDto } from './dto/user-public-profile.dto';
import { SystemRole } from '../../common/enums/system-role.enum';
import type { AccessTokenPayload } from '../auth/constants/token-payload.type';
import { updateSecurityActionTime } from '../auth/helpers/security.helper';
// import { EventEmitter2 } from '@nestjs/event-emitter';
// import { AuthService } from '../auth/auth.service';
// import { SecurityEvents } from '../../common/events/security.events';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly favoriteRepository: FavoriteRepository,
    // @Inject(forwardRef(() => AuthService))
    // private readonly eventEmitter: EventEmitter2,
    // private readonly authService: AuthService,
    private readonly dataSource: DataSource,
    private readonly logger: PinoLogger,
  ) {}

  // ==========================================
  // Public API (called by controllers)
  // ==========================================

  /**
   * Gets the profile of the current user.
   * @param userId The ID of the user to get the profile for.
   * @returns The profile of the current user.
   * @throws NotFoundException if the user is not found.
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findNotDeletedById(
      userId,
      { club: true },
      {
        id: true,
        email: true,
        username: true,
        first_name: true,
        last_name: true,
        is_verified: true,
        status: true,
        club_id: true,
        member_role: true,
        system_role: true,
        profile_image_url: true,
        club: {
          id: true,
          sofa_score_club_id: true,
          name: true,
          logo_url: true,
          status: true,
        },
      },
    );

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  /**
   * Updates the profile of the current user.
   * @param userId The ID of the user to update.
   * @param dto The data to update the user profile with.
   * @returns The updated user profile.
   * @throws NotFoundException if the user is not found.
   */
  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<Partial<UpdateUserDto>> {
    const user = await this.findOneByIdOrFail(userId);

    const updatedFileds: Partial<UpdateUserDto> = {};

    if (dto.first_name) updatedFileds.first_name = dto.first_name;
    if (dto.last_name) updatedFileds.last_name = dto.last_name;
    if (dto.profile_image_url)
      updatedFileds.profile_image_url = dto.profile_image_url;

    // Update user profile
    const updatedUser = await this.userRepository.internalRepo.update(
      user.id,
      updatedFileds,
    );

    if (updatedUser.affected === 0) {
      throw new InternalServerErrorException('User profile not updated');
    }

    return updatedFileds;
  }

  /**
   * Soft deletes the account of the current user.
   * Also soft-deletes all associated favorites within the same ACID transaction.
   *
   * @param userId The ID of the user to soft delete.
   * @throws NotFoundException if the user is not found.
   * @throws BadRequestException if the user is an owner of an active club.
   * @throws InternalServerErrorException if the soft deletion process fails.
   */
  async softDeleteAccount(userId: string): Promise<void> {
    const user = await this.ensureUserCanBeDeletedOrThrow(userId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // If user is a lone owner of an active club, dissolve the club atomically
      if (
        user.member_role === TeamRole.OWNER &&
        user.club &&
        user.club?.owner_id === user.id &&
        user.club?.status === ClubStatus.ACTIVE
      ) {
        const club = user.club;
        club.status = ClubStatus.SOFT_DELETED;
        await queryRunner.manager.save(Club, club);
        await queryRunner.manager.softRemove(Club, club);
      }

      user.club_id = null;
      user.member_role = TeamRole.NONE;
      user.last_security_action_at = updateSecurityActionTime();

      // We maintain the user row but change status and deleted_at
      user.status = AccountStatus.SOFT_DELETED;

      // Free up the email and username by anonymizing the soft-deleted record safely within varchar limits
      this.anonymizeUserRecord(user);

      // Save and soft-remove the user record using the transactional entity manager
      await queryRunner.manager.save(user);
      await queryRunner.manager.softRemove(user);

      // Soft-delete all associated favorites using the FavoriteRepository within the transaction
      await this.favoriteRepository.softDeleteByUserId(
        userId,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      this.logger.info(
        `User ${userId} and their favorites soft-deleted successfully`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error soft-deleting user ${userId} and favorites`,
        error,
      );
      throw new InternalServerErrorException('Failed to delete account');
    } finally {
      await queryRunner.release();
    }
  }

  // ==========================================
  // Internal API (called by other modules)
  // ==========================================

  /**
   * Finds a user by ID and returns null if not found.
   * @param id The ID of the user to find.
   * @returns The user with the specified ID or null if not found.
   */
  async findOneById(id: string): Promise<User | null> {
    return await this.userRepository.findNotDeletedById(id);
  }

  /**
   * Finds a user by email and returns null if not found.
   * @param email The email of the user to find.
   * @returns The user with the specified email or null if not found.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findActiveByEmail(email);
  }

  /**
   * Finds a user by ID and throws an exception if not found.
   * @param id The ID of the user to find.
   * @returns The user with the specified ID.
   * @throws NotFoundException if the user is not found.
   */
  async findOneByIdOrFail(
    id: string,
    requester?: AccessTokenPayload,
  ): Promise<UserPublicProfileResDto> {
    const targetUser = await this.userRepository.findActiveById(id);

    if (!targetUser) {
      throw new NotFoundException(`Invalid user ID: ${id}`);
    }

    // Prevent a normal user from accessing or viewing an admin/non-user account
    if (
      requester &&
      requester.sys_role === SystemRole.USER &&
      targetUser.system_role !== SystemRole.USER
    ) {
      throw new ForbiddenException('You are not authorized to view this user');
    }

    return this.mapUserPublicProfile(targetUser);
  }

  /**
   * Updates the club membership of a user.
   * @param userId The ID of the user to update.
   * @param clubId The ID of the club to assign to the user.
   * @param role The role of the user in the club.
   * @throws NotFoundException if the user is not found.
   * @throws InternalServerErrorException if the club membership update fails.
   */
  async updateClubMembership(
    userId: string,
    clubId: string | null = null,
    role: TeamRole = TeamRole.NONE,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOneBy(User, { id: userId });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.club_id = clubId;
      user.member_role = role;

      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();
      this.logger.info(
        `Updated club membership for user ${userId} to club ${clubId} with role ${role}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error updating club membership for user ${userId}`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to update club membership',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Searches for users based on email, status, and role with pagination.
   *
   * @param dto - The search filters and pagination parameters.
   * @returns A paginated list of users and the total count.
   */
  async searchUsers(dto: UserSearchQueryDto): Promise<UserSearchResultDto> {
    const {
      page = 1,
      limit = 10,
      sortBy = UserSortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
      ...filters
    } = dto;

    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.internalRepo
      .createQueryBuilder('user')
      .where('user.status NOT IN (:...statuses)', {
        statuses: [
          AccountStatus.SOFT_DELETED,
          AccountStatus.DEACTIVATED,
          AccountStatus.BANNED,
        ],
      })
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.first_name',
        'user.last_name',
        'user.status',
        'user.system_role',
        'user.member_role',
        'user.created_at',
      ]);

    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        let searchValue = value;
        const likeSearchFields = ['email', 'username', 'club_name'];

        if (likeSearchFields.includes(key)) {
          searchValue = `%${value}%`;
          queryBuilder.andWhere(`user.${key} ilike :${key}`, {
            [key]: searchValue,
          });
        } else {
          queryBuilder.andWhere(`user.${key} = :${key}`, {
            [key]: searchValue,
          });
        }
      }
    }

    // Secure whitelisted sort mapping
    const sortMapping: Record<UserSortField, string> = {
      [UserSortField.CREATED_AT]: 'user.created_at',
      [UserSortField.EMAIL]: 'user.email',
      [UserSortField.USERNAME]: 'user.username',
    };

    const orderColumn = sortMapping[sortBy] || 'user.created_at';
    const orderDirection = sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    queryBuilder.orderBy(orderColumn, orderDirection);

    // Apply stable tie-breaker sorting
    if (orderColumn !== 'user.created_at') {
      queryBuilder.addOrderBy('user.created_at', 'DESC');
    }
    queryBuilder.addOrderBy('user.id', 'ASC');

    const [users, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      users: users.map((user) => this.mapUserPublicProfile(user)),
      total,
      page,
      limit,
    };
  }

  /**
   * @private
   *
   * Maps a user entity to a public profile response DTO.
   * @param user - The user entity to map.
   * @returns A public profile response DTO.
   */
  private mapUserPublicProfile(user: User): UserPublicProfileResDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      club_id: user.club_id,
      is_club_member: !!user.club_id,
      profile_image_url: user.profile_image_url,
      club: user.club,
    };
  }

  /**
   * @private
   *
   * Anonymizes a user's email and username to free them up for new registrations.
   * @param user - The user entity to anonymize.
   */
  private anonymizeUserRecord(user: User): void {
    user.original_email = user.email;
    user.original_username = user.username;

    const shortId = user.id.split('-')[0]; // first 8 chars of UUID
    const timestamp = Date.now(); // short timestamp

    user.username = `del_${shortId}_${timestamp}`;
    user.email = `${user.username}@deleted.local`;
  }

  /**
   * @private
   *
   * Ensures that a user can be safely deleted.
   * Throws an error if the user is an owner of an active club with other staff.
   * @param userId - The ID of the user to check.
   * @returns The user entity if safe to delete.
   * @throws NotFoundException if the user is not found.
   * @throws BadRequestException if the user is an owner of an active club with other staff.
   */
  private async ensureUserCanBeDeletedOrThrow(userId: string): Promise<User> {
    const user = await this.userRepository.internalRepo.findOne({
      where: {
        id: userId,
        status: Not(In([AccountStatus.SOFT_DELETED, AccountStatus.BANNED])),
      },
      relations: ['club'],
      select: {
        id: true,
        email: true,
        username: true,
        first_name: true,
        last_name: true,
        status: true,
        system_role: true,
        member_role: true,
        club_id: true,
        last_security_action_at: true,
        club: {
          id: true,
          owner_id: true,
          status: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      user.member_role === TeamRole.OWNER &&
      user.club &&
      user.club?.owner_id === user.id &&
      user.club?.status === ClubStatus.ACTIVE
    ) {
      const hasOtherMembers = await this.userRepository.hasOtherActiveMembers(
        user.club_id!,
        user.id,
      );

      if (hasOtherMembers) {
        this.logger.error(
          `User ${userId} is an owner of an active club with other members`,
        );
        throw new BadRequestException(
          'You cannot delete your account because you are an owner of an active club with other members.',
        );
      }
    }

    return user;
  }

  /* TODO: Implement later */

  // /**
  //  * Deactivates the account of the current user.
  //  * @param userId The ID of the user to deactivate.
  //  * @throws NotFoundException if the user is not found.
  //  * @throws BadRequestException if the user is an owner of an active club.
  //  */
  // async deactivateAccount(userId: string): Promise<void> {
  //   const user = await this.userRepository.internalRepo.findOne({
  //     where: { id: userId, status: AccountStatus.ACTIVE },
  //     relations: ['club'],
  //   });

  //   if (!user) {
  //     throw new NotFoundException('User not found');
  //   }

  //   // Owner cannot deactivate their account, transfer ownership first or delete the club.
  //   if (
  //     user.club?.owner_id === user.id &&
  //     user.member_role === TeamRole.OWNER &&
  //     user.club?.status === ClubStatus.ACTIVE
  //   ) {
  //     throw new BadRequestException(
  //       'Owners cannot deactivate their accounts, transfer ownership first or delete the club.',
  //     );
  //   }

  //   user.status = AccountStatus.DEACTIVATED;
  //   user.last_security_action_at = updateSecurityActionTime();

  //   this.eventEmitter.emit(SecurityEvents.USER_DEACTIVATED, { userId });

  //   await this.userRepository.internalRepo.save(user);
  //   this.logger.info(`User ${userId} deactivated their account`);

  //   await this.authService.logout(userId);
  // }

  // /**
  //  * Activates the account of the current user.
  //  * @param userId The ID of the user to activate.
  //  * @returns The updated user.
  //  * @throws NotFoundException if the user is not found or not deactivated.
  //  */
  // async activateAccount(userId: string): Promise<User> {
  //   const user = await this.userRepository.internalRepo.findOne({
  //     where: { id: userId, status: AccountStatus.DEACTIVATED },
  //   });

  //   if (!user) {
  //     throw new NotFoundException('Deactivated user not found');
  //   }

  //   user.status = AccountStatus.ACTIVE;
  //   user.last_security_action_at = updateSecurityActionTime();

  //   await this.userRepository.internalRepo.save(user);
  //   this.logger.info(`User ${userId} reactivated their account`);

  //   this.eventEmitter.emit(SecurityEvents.USER_ACTIVATED, { userId });

  //   return user;
  // }
}
