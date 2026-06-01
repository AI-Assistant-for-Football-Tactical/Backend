import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, ILike, type FindOptionsWhere } from 'typeorm';
import { ClubRepository } from './repositories/club.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { Club } from './entities/club.entity';
import { User } from '../user/entities/user.entity';
import { ClubStatus } from './constants/club-status.enum';
import { TeamRole } from '../../common/enums/team-role.enum';
import { UpdateClubStatusDto } from './dto/update-club-status.dto';
import { ClubSearchQueryDto } from './dto/club-search-query.dto';
import {
  ClubResponseDto,
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
    if (!user.club_id) {
      throw new NotFoundException('User is not associated with any club.');
    }

    const club = await this.clubRepository.findNotDeletedById(user.club_id);

    if (!club) {
      throw new NotFoundException('Club not found.');
    }

    return this.mapToResponse(club);
  }

  /**
   * Handles user leaving a club.
   */
  async leaveClub(user: AccessTokenPayload): Promise<void> {
    if (!user.club_id) {
      throw new NotFoundException('User is not associated with any club.');
    }

    const dbUser = await this.userRepository.findActiveById(user.id);

    if (!dbUser) {
      throw new NotFoundException('User not found.');
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
        user.club_id,
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
          where: { id: user.club_id },
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
    if (!user.club_id) {
      throw new NotFoundException('User not in a club.');
    }

    const currentOwner = await this.userRepository.findActiveById(user.id);

    if (!currentOwner || currentOwner.member_role !== TeamRole.OWNER) {
      throw new ForbiddenException(
        'Only the club OWNER can initiate succession.',
      );
    }

    const targetUser = await this.userRepository.findActiveById(targetUserId);

    if (!targetUser) {
      throw new NotFoundException('Target user not found.');
    }

    if (targetUser.club_id !== user.club_id) {
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
        where: { id: user.club_id },
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

    const mappedClubs = clubs.map((club) => this.mapToResponse(club));

    return {
      clubs: mappedClubs,
      total,
      page,
      limit,
    };
  }

  /**
   * Updates a club's status and invalidates its members' sessions if suspended.
   */
  async updateClubStatus(id: string, dto: UpdateClubStatusDto): Promise<void> {
    const club = await this.clubRepository.findNotDeletedById(id);

    if (!club) {
      throw new NotFoundException('Club not found.');
    }

    club.status = dto.status;
    await this.clubRepository.internalRepo.save(club);

    // If status is changed to SUSBENDED (suspended), invalidate member sessions immediately
    if (dto.status === ClubStatus.SUSBENDED) {
      await this.userRepository.internalRepo.update(
        { club_id: id },
        { last_security_action_at: new Date() },
      );
    }
  }

  private mapToResponse(club: Club): ClubResponseDto {
    return {
      id: club.id,
      name: club.name,
      description: club.description,
      sofa_score_club_id: club.sofa_score_club_id,
      logo_url: club.logo_url,
      owner_id: club.owner_id,
      status: club.status,
      created_at: club.created_at,
    };
  }
}
