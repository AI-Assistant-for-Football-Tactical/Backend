import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  In,
  Not,
  FindOptionsSelect,
  FindOptionsRelations,
} from 'typeorm';
import { User } from '../entities/user.entity';
import { AccountStatus } from '../../../common/enums/account-status.enum';
import { BaseRepository } from '../../../common/repositories/base.repository';

export const USER_RELATIONS = ['club', 'favorites'] as const;
export type UserRelation = (typeof USER_RELATIONS)[number];

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    protected readonly repo: Repository<User>,
  ) {
    super(repo);
  }

  get internalRepo(): Repository<User> {
    return this.repo;
  }

  /**
   * Finds a user by ID, ensuring they are ACTIVE.
   */
  async findActiveById(
    id: string,
    relations?: FindOptionsRelations<User>,
    select?: FindOptionsSelect<User>,
  ): Promise<User | null> {
    return this.repo.findOne({
      where: { id, status: AccountStatus.ACTIVE },
      relations,
      select,
    });
  }

  /**
   * Finds a user by Email, ensuring they are ACTIVE.
   */
  async findActiveByEmail(
    email: string,
    relations?: FindOptionsRelations<User>,
    select?: FindOptionsSelect<User>,
  ): Promise<User | null> {
    return this.repo.findOne({
      where: { email, status: AccountStatus.ACTIVE },
      relations,
      select,
    });
  }

  /**
   * Finds a user by ID, ensuring they are not soft-deleted and not banned.
   */
  async findNotDeletedNotBannedById(
    id: string,
    relations?: FindOptionsRelations<User>,
    select?: FindOptionsSelect<User>,
  ): Promise<User | null> {
    return this.repo.findOne({
      where: {
        id,
        status: Not(In([AccountStatus.SOFT_DELETED, AccountStatus.BANNED])),
      },
      relations,
      select,
    });
  }

  /**
   * Finds a user by email, ensuring they are not soft-deleted and not banned.
   */
  async findNotDeletedNotBannedByEmail(
    email: string,
    relations?: FindOptionsRelations<User>,
    select?: FindOptionsSelect<User>,
  ): Promise<User | null> {
    return this.repo.findOne({
      where: {
        email,
        status: Not(In([AccountStatus.SOFT_DELETED, AccountStatus.BANNED])),
      },
      relations,
      select,
    });
  }

  /**
   * Finds a user by ID with any of the allowed statuses.
   */
  async findByIdWithStatus(
    id: string,
    statuses: AccountStatus[],
    relations?: FindOptionsRelations<User>,
    select?: FindOptionsSelect<User>,
  ): Promise<User | null> {
    return this.repo.findOne({
      where: { id, status: In(statuses) },
      relations,
      select,
    });
  }

  /**
   * Excludes SOFT_DELETED accounts. Useful for generic queries where we want
   * both ACTIVE and DEACTIVATED but not SOFT_DELETED.
   */
  async findNotDeletedById(
    id: string,
    relations?: FindOptionsRelations<User>,
    select?: FindOptionsSelect<User>,
  ): Promise<User | null> {
    return this.repo.findOne({
      where: { id, status: Not(AccountStatus.SOFT_DELETED) },
      relations,
      select,
    });
  }

  /**
   * Checks if a club has other active (non-deleted, non-banned) members besides the specified user.
   *
   * @param clubId        - The ID of the club.
   * @param excludeUserId - The ID of the user to exclude from the check.
   * @returns             - Promise resolving to true if other active members exist, false otherwise.
   */
  async hasOtherActiveMembers(
    clubId: string,
    excludeUserId: string,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: {
        club_id: clubId,
        id: Not(excludeUserId),
        status: Not(In([AccountStatus.SOFT_DELETED, AccountStatus.BANNED])),
      },
    });
    return count > 0;
  }
}
