import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Favorite } from '../entities/favorite.entity';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { FavoriteTargetType } from '../../../common/enums/favorite-target-type.enum';

@Injectable()
export class FavoriteRepository extends BaseRepository<Favorite> {
  constructor(
    @InjectRepository(Favorite)
    protected readonly repo: Repository<Favorite>,
  ) {
    super(repo);
  }

  get internalRepo(): Repository<Favorite> {
    return this.repo;
  }

  /**
   * Finds all favorites for a specific user.
   */
  async findByUserId(userId: string): Promise<Favorite[]> {
    return this.repo.find({
      where: { user_id: userId },
    });
  }

  /**
   * Finds a specific favorite for a user.
   */
  async findOneByUserAndTarget(
    userId: string,
    targetType: FavoriteTargetType,
    targetId: string,
  ): Promise<Favorite | null> {
    return this.repo.findOne({
      where: {
        user_id: userId,
        target_type: targetType,
        sofa_score_target_id: targetId,
      },
    });
  }

  /**
   * Soft deletes all favorites for a specific user.
   * Supports execution within a transactional EntityManager to participate in ACID transactions.
   *
   * @param userId The ID of the user whose favorites should be soft deleted.
   * @param transactionalManager Optional transactional EntityManager.
   * @returns A promise that resolves when the soft-delete is complete.
   */
  async softDeleteByUserId(
    userId: string,
    transactionalManager?: EntityManager,
  ): Promise<void> {
    const repository = transactionalManager
      ? transactionalManager.getRepository(Favorite)
      : this.repo;

    await repository.softDelete({ user_id: userId });
  }
}
