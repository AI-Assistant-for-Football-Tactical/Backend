import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import { Invitation } from '../entities/invitation.entity';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { InvitationStatus } from '../constants/invitation-status.enum';
import { TeamRole } from '../../../common/enums/team-role.enum';
import { InvitationSearchQueryDto } from '../dto/invitation-search-query.dto';

/**
 * Custom repository for Invitation entity.
 * Handles database operations and applies data isolation.
 */
@Injectable()
export class InvitationRepository extends BaseRepository<Invitation> {
  private readonly logger = new Logger(InvitationRepository.name);

  /**
   * Constructs the InvitationRepository.
   *
   * @param repo The TypeORM Repository for Invitation.
   */
  constructor(
    @InjectRepository(Invitation)
    protected readonly repo: Repository<Invitation>,
  ) {
    super(repo);
  }

  /**
   * Gets the underlying TypeORM Repository.
   */
  get internalRepo(): Repository<Invitation> {
    return this.repo;
  }

  /**
   * Checks if there is an active pending invitation for a user from a specific club.
   *
   * @param toUserId Target user ID
   * @param clubId Club ID
   * @returns True if an active pending invitation exists, false otherwise
   */
  async hasActivePendingInvite(
    toUserId: string,
    clubId: string,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: {
        to_user_id: toUserId,
        club_id: clubId,
        status: InvitationStatus.PENDING,
        expires_at: MoreThan(new Date()),
      },
    });
    return count > 0;
  }

  /**
   * Hashes the raw token using SHA-256 for secure storage.
   *
   * @param token The raw token to hash
   * @returns Hashed token as a hex string
   * @throws InternalServerErrorException If hashing fails
   */
  hashToken(token: string): string {
    try {
      return crypto.createHash('sha256').update(token).digest('hex');
    } catch (err) {
      this.logger.error('Error hashing token', err);
      throw new InternalServerErrorException('Error hashing token');
    }
  }

  /**
   * Finds all active pending invitations for a specific club.
   *
   * @param clubId The club ID
   * @returns Array of pending invitations
   */
  async findActivePendingInvitesByClub(clubId: string): Promise<Invitation[]> {
    return this.repo.find({
      where: {
        club_id: clubId,
        status: InvitationStatus.PENDING,
        expires_at: MoreThan(new Date()),
      },
      relations: ['to_user'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Creates and persists a pending invitation.
   *
   * @param data Required invitation creation fields
   * @returns Persisted invitation entity
   */
  async createPendingInvitation(data: {
    token: string;
    clubId: string;
    fromUserId: string;
    toUserId: string;
    toEmail: string;
    expiresAt: Date;
    role?: TeamRole;
  }): Promise<Invitation> {
    const invitation = this.repo.create({
      token: data.token,
      status: InvitationStatus.PENDING,
      club_id: data.clubId,
      from_user_id: data.fromUserId,
      to_user_id: data.toUserId,
      to_email: data.toEmail,
      expires_at: data.expiresAt,
      role: data.role ?? TeamRole.STAFF,
    });

    return this.repo.save(invitation);
  }

  /**
   * Finds all active pending invitations for a specific invited user.
   *
   * @param userId Invited user ID
   * @returns Array of pending invitations
   */
  async findActivePendingInvitesForUser(userId: string): Promise<Invitation[]> {
    return this.repo.find({
      where: {
        to_user_id: userId,
        status: InvitationStatus.PENDING,
        expires_at: MoreThan(new Date()),
      },
      relations: ['club', 'from_user'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Finds an invitation with all relations needed for a response action.
   *
   * @param id Invitation UUID
   * @returns Invitation entity or null if not found
   */
  async findForResponseById(id: string): Promise<Invitation | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['club', 'from_user', 'to_user'],
    });
  }

  /**
   * Persists an invitation update.
   *
   * @param invitation Invitation entity to save
   * @returns Persisted invitation entity
   */
  async saveInvitation(invitation: Invitation): Promise<Invitation> {
    return this.repo.save(invitation);
  }

  /**
   * Searches invitations for admin views with pagination and filters.
   *
   * @param query Search filters and pagination options
   * @returns Matching invitations and total count
   */
  async searchForAdmin(
    query: InvitationSearchQueryDto,
  ): Promise<[Invitation[], number]> {
    const { status, club_id, to_email, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.createQueryBuilder('invitation');

    if (status) {
      queryBuilder.andWhere('invitation.status = :status', { status });
    }

    if (club_id) {
      queryBuilder.andWhere('invitation.club_id = :club_id', { club_id });
    }

    if (to_email) {
      queryBuilder.andWhere('invitation.to_email LIKE :to_email', {
        to_email: `%${to_email}%`,
      });
    }

    return queryBuilder
      .leftJoinAndSelect('invitation.club', 'club')
      .leftJoinAndSelect('invitation.from_user', 'from_user')
      .leftJoinAndSelect('invitation.to_user', 'to_user')
      .orderBy('invitation.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
  }

  /**
   * Finds an invitation by its UUID.
   *
   * @param id Invitation UUID
   * @returns Invitation entity or null if not found
   */
  async findById(id: string): Promise<Invitation | null> {
    return this.repo.findOne({
      where: { id },
    });
  }
}
