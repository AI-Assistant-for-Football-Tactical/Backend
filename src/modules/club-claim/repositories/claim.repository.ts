import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsRelations } from 'typeorm';
import { Claim } from '../entities/claim.entity';
import { BaseRepository } from '../../../common/repositories/base.repository';

@Injectable()
export class ClaimRepository extends BaseRepository<Claim> {
  constructor(
    @InjectRepository(Claim)
    protected readonly repo: Repository<Claim>,
  ) {
    super(repo);
  }

  get internalRepo(): Repository<Claim> {
    return this.repo;
  }

  /**
   * Finds the most recent claim submitted by a specific user.
   *
   * @param userId - The ID of the user.
   * @returns      - Promise resolving to the Claim or null.
   */
  async getRecentClaim(userId: string): Promise<Claim | null> {
    return this.repo.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Finds a claim by its UUID.
   *
   * @param id        - The UUID of the claim.
   * @param relations - Optional relations to eagerly load.
   * @returns         - Promise resolving to the Claim or null.
   */
  async findById(
    id: string,
    relations?: FindOptionsRelations<Claim>,
  ): Promise<Claim | null> {
    return this.repo.findOne({
      where: { id },
      relations,
    });
  }
}
