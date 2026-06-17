import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, ILike, In, type FindOptionsWhere } from 'typeorm';
import { ClubRepository } from './repositories/club.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { Club } from './entities/club.entity';
import { User } from '../user/entities/user.entity';
import { AuthToken } from '../auth/entities/token.entity';
import { AuthTokenType } from '../auth/constants/auth-token-type.enum';
import { ClubStatus } from './constants/club-status.enum';
import { TeamRole } from '../../common/enums/team-role.enum';
import { AccountStatus } from '../../common/enums/account-status.enum';
import { UpdateClubStatusDto } from './dto/update-club-status.dto';
import { ClubSearchQueryDto } from './dto/club-search-query.dto';
import { ClubMemberSearchQueryDto } from './dto/club-member-search-query.dto';
import {
  ClubMemberResponseDto,
  ClubResponseDto,
  PaginatedClubMembersResponseDto,
  PaginatedClubsResponseDto,
} from './dto/club-governance.dto';
import type { AccessTokenPayload } from '../auth/constants/token-payload.type';

@Injectable()
export class ClubService {
  constructor(
    private readonly clubRepository: ClubRepository,
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
  ) {}
  /**
   * Retrieves the club details associated with the user.
   */
  async getMyClub(user: AccessTokenPayload): Promise<ClubResponseDto> {
    const dbUser = await this.userRepository.findActiveById(user.id);

    if (!dbUser) {
      throw new NotFoundException('User not found.');
    }

    if (!dbUser.club_id) {
      throw new NotFoundException('User is not associated with any club.');
    }

    const club = await this.clubRepository.findNotDeletedById(dbUser.club_id);

    if (!club) {
      throw new NotFoundException('Club not found.');
    }

    return ClubResponseDto.fromEntity(club);
  }

  /**
   * Lists active members of the authenticated user's current club.
   */
  async listMyClubMembers(
    user: AccessTokenPayload,
    query: ClubMemberSearchQueryDto = {},
  ): Promise<PaginatedClubMembersResponseDto> {
    const dbUser = await this.userRepository.findActiveById(user.id);

    if (!dbUser) {
      throw new NotFoundException('User not found.');
    }

    if (!dbUser.club_id) {
      throw new NotFoundException('User is not associated with any club.');
    }

    return this.listClubMembersByClubId(dbUser.club_id, query);
  }

  /**
   * Returns a single active member from the authenticated user's current club.
   */
  async getMyClubMember(
    user: AccessTokenPayload,
    memberId: string,
  ): Promise<ClubMemberResponseDto> {
    const dbUser = await this.userRepository.findActiveById(user.id);

    if (!dbUser) {
      throw new NotFoundException('User not found.');
    }

    if (!dbUser.club_id) {
      throw new NotFoundException('User is not associated with any club.');
    }

    const member = await this.userRepository.internalRepo.findOne({
      where: {
        id: memberId,
        club_id: dbUser.club_id,
        status: AccountStatus.ACTIVE,
      },
      select: {
        id: true,
        username: true,
        first_name: true,
        last_name: true,
        profile_image_url: true,
        member_role: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Club member not found.');
    }

    return ClubMemberResponseDto.fromEntity(member);
  }

  /**
   * Handles user leaving a club.
   */
  async leaveClub(user: AccessTokenPayload): Promise<void> {
    const dbUser = await this.userRepository.findActiveById(user.id);

    if (!dbUser) {
      throw new NotFoundException('User not found.');
    }

    if (!dbUser.club_id) {
      throw new NotFoundException('User is not associated with any club.');
    }

    if (dbUser.member_role === TeamRole.STAFF) {
      // STAFF unlinks immediately
      dbUser.club_id = null;
      dbUser.member_role = TeamRole.NONE;
      dbUser.last_security_action_at = new Date();
      await this.userRepository.internalRepo.save(dbUser);
      return;
    }

    if (dbUser.member_role === TeamRole.OWNER) {
      // Count other members in the club
      const hasOtherMembers = await this.userRepository.hasOtherActiveMembers(
        dbUser.club_id,
        user.id,
      );

      if (hasOtherMembers) {
        throw new ForbiddenException(
          'OWNER with remaining staff must perform succession first.',
        );
      }

      // Lone OWNER dissolves club atomically
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const club = await queryRunner.manager.findOne(Club, {
          where: { id: dbUser.club_id },
        });

        if (club) {
          club.status = ClubStatus.SOFT_DELETED;
          await queryRunner.manager.save(Club, club);
          await queryRunner.manager.softRemove(Club, club);
        }

        dbUser.club_id = null;
        dbUser.member_role = TeamRole.NONE;
        dbUser.last_security_action_at = new Date();
        await queryRunner.manager.save(User, dbUser);

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }
  }

  /**
   * Transfer ownership to a STAFF member.
   */
  async succession(
    user: AccessTokenPayload,
    targetUserId: string,
  ): Promise<void> {
    const currentOwner = await this.userRepository.findActiveById(user.id);

    if (!currentOwner) {
      throw new NotFoundException('User not found.');
    }

    if (!currentOwner.club_id) {
      throw new NotFoundException('User not in a club.');
    }

    if (currentOwner.member_role !== TeamRole.OWNER) {
      throw new ForbiddenException(
        'Only the club OWNER can initiate succession.',
      );
    }

    const targetUser = await this.userRepository.findActiveById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException('Target user not found.');
    }

    if (targetUser.club_id !== currentOwner.club_id) {
      throw new BadRequestException(
        'Target user is not a member of this club.',
      );
    }

    if (targetUser.member_role !== TeamRole.STAFF) {
      throw new BadRequestException('Target user is not a STAFF member.');
    }

    // Atomically swap roles
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const club = await queryRunner.manager.findOne(Club, {
        where: { id: currentOwner.club_id },
      });

      if (!club) {
        throw new NotFoundException('Club not found.');
      }

      // Update club owner ID
      club.owner_id = targetUserId;
      await queryRunner.manager.save(Club, club);

      // Current OWNER becomes STAFF
      currentOwner.member_role = TeamRole.STAFF;
      currentOwner.last_security_action_at = new Date();
      await queryRunner.manager.save(User, currentOwner);

      // Target STAFF becomes OWNER
      targetUser.member_role = TeamRole.OWNER;
      targetUser.last_security_action_at = new Date();
      await queryRunner.manager.save(User, targetUser);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Remove a STAFF member from the authenticated owner's club.
   */
  async removeMember(
    user: AccessTokenPayload,
    targetUserId: string,
  ): Promise<void> {
    return this.removeMembers(user, [targetUserId]);
  }

  /**
   * Remove STAFF members from the authenticated owner's club atomically.
   */
  async removeMembers(
    user: AccessTokenPayload,
    targetUserIds: string[],
  ): Promise<void> {
    if (targetUserIds.length === 0) {
      throw new BadRequestException('At least one member ID is required.');
    }

    const uniqueTargetUserIds = [...new Set(targetUserIds)];

    if (uniqueTargetUserIds.length !== targetUserIds.length) {
      throw new BadRequestException('Duplicate member IDs are not allowed.');
    }

    if (uniqueTargetUserIds.includes(user.id)) {
      throw new BadRequestException('Owner cannot remove themselves.');
    }

    const owner = await this.userRepository.findActiveById(user.id);

    if (!owner) {
      throw new NotFoundException('User not found.');
    }

    if (!owner.club_id) {
      throw new NotFoundException('User not in a club.');
    }

    if (owner.member_role !== TeamRole.OWNER) {
      throw new ForbiddenException('Only the club OWNER can remove members.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const targetUsers = await queryRunner.manager.find(User, {
        where: {
          id: In(uniqueTargetUserIds),
          status: AccountStatus.ACTIVE,
        },
      });

      if (targetUsers.length !== uniqueTargetUserIds.length) {
        throw new NotFoundException('One or more target users were not found.');
      }

      if (
        targetUsers.some((targetUser) => targetUser.club_id !== owner.club_id)
      ) {
        throw new BadRequestException(
          'One or more target users are not members of this club.',
        );
      }

      if (
        targetUsers.some(
          (targetUser) => targetUser.member_role !== TeamRole.STAFF,
        )
      ) {
        throw new BadRequestException('Only STAFF members can be removed.');
      }

      const securityActionAt = new Date();
      for (const targetUser of targetUsers) {
        targetUser.club_id = null;
        targetUser.member_role = TeamRole.NONE;
        targetUser.last_security_action_at = securityActionAt;
      }

      await queryRunner.manager.save(User, targetUsers);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // --- Admin Club Operations ---

  /**
   * Returns a paginated list of all clubs, optionally filtered by name (case-insensitive).
   */
  async listClubs(
    query: ClubSearchQueryDto,
  ): Promise<PaginatedClubsResponseDto> {
    const { name, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Club> = {};
    if (name) {
      where.name = ILike(`%${name}%`);
    }

    const [clubs, total] = await this.clubRepository.internalRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { name: 'ASC' },
    });

    const mappedClubs = clubs.map((club) => ClubResponseDto.fromEntity(club));

    return {
      clubs: mappedClubs,
      total,
      page,
      limit,
    };
  }

  /**
   * Lists active members of a club for admins.
   */
  async listClubMembersForAdmin(
    clubId: string,
    query: ClubMemberSearchQueryDto = {},
  ): Promise<PaginatedClubMembersResponseDto> {
    const club = await this.clubRepository.findNotDeletedById(clubId);

    if (!club) {
      throw new NotFoundException('Club not found.');
    }

    return this.listClubMembersByClubId(clubId, query);
  }

  /**
   * Updates a club's status and invalidates its members' sessions if suspended.
   */
  async updateClubStatus(id: string, dto: UpdateClubStatusDto): Promise<void> {
    const club = await this.clubRepository.findNotDeletedById(id);

    if (!club) {
      throw new NotFoundException('Club not found.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      club.status = dto.status;
      await queryRunner.manager.save(Club, club);

      const members = await queryRunner.manager.find(User, {
        where: { club_id: id },
        select: { id: true },
      });
      const memberIds = members.map((member) => member.id);

      if (memberIds.length > 0) {
        await queryRunner.manager.delete(AuthToken, {
          user_id: In(memberIds),
          type: AuthTokenType.REFRESH,
        });
      }

      await queryRunner.manager.update(
        User,
        { club_id: id },
        { last_security_action_at: new Date() },
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Force liquidates a club.
   * Soft-deletes the club and strips all associated members of their club and roles,
   * revoking their refresh token sessions immediately.
   *
   * @param clubId - UUID of the club to liquidate.
   * @returns A promise that resolves when the liquidation is complete.
   * @throws NotFoundException if the club is not found or already deleted.
   */
  async liquidateClub(clubId: string): Promise<void> {
    const club = await this.clubRepository.findNotDeletedById(clubId);

    if (!club) {
      throw new NotFoundException('Club not found.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      club.status = ClubStatus.SOFT_DELETED;
      await queryRunner.manager.save(Club, club);
      await queryRunner.manager.softRemove(Club, club);

      const members = await queryRunner.manager.find(User, {
        where: { club_id: clubId },
        select: { id: true },
      });
      const memberIds = members.map((member) => member.id);

      if (memberIds.length > 0) {
        await queryRunner.manager.update(
          User,
          { id: In(memberIds) },
          {
            club_id: null,
            member_role: TeamRole.NONE,
            last_security_action_at: new Date(),
          },
        );

        await queryRunner.manager.delete(AuthToken, {
          user_id: In(memberIds),
          type: AuthTokenType.REFRESH,
        });
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async listClubMembersByClubId(
    clubId: string,
    query: ClubMemberSearchQueryDto,
  ): Promise<PaginatedClubMembersResponseDto> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'member_role',
      sortOrder = 'ASC',
    } = query;
    const [members, total] =
      await this.userRepository.internalRepo.findAndCount({
        where: {
          club_id: clubId,
          status: AccountStatus.ACTIVE,
        },
        select: {
          id: true,
          username: true,
          first_name: true,
          last_name: true,
          profile_image_url: true,
          member_role: true,
        },
        order: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      members: members.map((member) =>
        ClubMemberResponseDto.fromEntity(member),
      ),
      total,
      page,
      limit,
    };
  }
}
