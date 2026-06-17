import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import {
  FavoriteSearchQueryDto,
  FavoriteSearchResultDto,
  FavoriteSortField,
  SortOrder,
} from './dto/favorite-search.dto';
import { FavoriteResDto } from './dto/favorite-res.dto';
import { FavoriteRepository } from './repositories/favorite.repository';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class FavoriteService {
  constructor(
    private readonly favoriteRepository: FavoriteRepository,
    private dataSource: DataSource,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Finds all favorites for a user with filters and pagination.
   *
   * @param userId The ID of the user whose favorites to retrieve.
   * @param dto Filter and pagination parameters.
   * @returns A paginated list of favorites and metadata.
   */
  async findAllByUser(
    userId: string,
    dto: FavoriteSearchQueryDto,
  ): Promise<FavoriteSearchResultDto> {
    const {
      page,
      limit,
      type,
      target_name,
      sortBy = FavoriteSortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = dto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.favoriteRepository
      .createQueryBuilder('favorite')
      .where('favorite.user_id = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('favorite.target_type = :type', { type });
    }

    if (target_name) {
      queryBuilder.andWhere('favorite.target_name ILIKE :targetName', {
        targetName: `%${target_name}%`,
      });
    }

    // Secure, whitelisted sort mapping
    const sortMapping: Record<FavoriteSortField, string> = {
      [FavoriteSortField.CREATED_AT]: 'favorite.created_at',
      [FavoriteSortField.TARGET_NAME]: 'favorite.target_name',
    };

    const orderColumn = sortMapping[sortBy] || 'favorite.created_at';
    const orderDirection = sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    queryBuilder.orderBy(orderColumn, orderDirection);

    // Apply stable tie-breaker sorting to guarantee deterministic results across pagination
    if (orderColumn !== 'favorite.created_at') {
      queryBuilder.addOrderBy('favorite.created_at', 'DESC');
    }
    queryBuilder.addOrderBy('favorite.id', 'ASC');

    const [favorites, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const items: FavoriteResDto[] = favorites.map((fav) => ({
      id: fav.id,
      user_id: fav.user_id,
      target_type: fav.target_type,
      sofa_score_target_id: fav.sofa_score_target_id,
      target_name: fav.target_name ?? '',
      created_at: fav.created_at,
    }));

    return {
      favorites: items,
      total,
      page,
      limit,
    };
  }

  /**
   * Retrieves a single favorite by its ID and user ID.
   *
   * @param userId The ID of the user.
   * @param id The ID of the favorite record.
   * @returns The favorite record mapped to a response DTO.
   * @throws NotFoundException if the favorite is not found or does not belong to the user.
   */
  async findOne(userId: string, id: string): Promise<FavoriteResDto> {
    const favorite = await this.favoriteRepository.internalRepo.findOne({
      where: { id, user_id: userId },
    });

    if (!favorite) {
      throw new NotFoundException(
        'Favorite not found or does not belong to the user',
      );
    }

    return {
      id: favorite.id,
      user_id: favorite.user_id,
      target_type: favorite.target_type,
      sofa_score_target_id: favorite.sofa_score_target_id,
      target_name: favorite.target_name ?? '',
      created_at: favorite.created_at,
    };
  }

  async create(userId: string, dto: CreateFavoriteDto): Promise<Favorite> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check for existing favorite
      const existing = await queryRunner.manager.findOne(Favorite, {
        where: {
          user_id: userId,
          target_type: dto.target_type,
          sofa_score_target_id: dto.sofa_score_target_id,
        },
      });

      if (existing) {
        throw new ConflictException('Already in favorites');
      }

      const favorite = queryRunner.manager.create(Favorite, {
        user_id: userId,
        target_type: dto.target_type,
        sofa_score_target_id: dto.sofa_score_target_id,
        target_name: dto.target_name,
      });

      await queryRunner.manager.save(favorite);
      await queryRunner.commitTransaction();

      this.logger.info(
        `Favorite added for user ${userId}: ${dto.target_type} ${dto.sofa_score_target_id}`,
      );
      return favorite;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Error creating favorite', error);
      throw new InternalServerErrorException('Failed to add favorite');
    } finally {
      await queryRunner.release();
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const favorite = await this.favoriteRepository.internalRepo.findOne({
      where: { id, user_id: userId },
    });

    if (!favorite) {
      throw new NotFoundException(
        'Favorite not found or does not belong to the user',
      );
    }

    await this.favoriteRepository.internalRepo.remove(favorite);
    this.logger.info(`Favorite removed for user ${userId}: ${id}`);
  }

  /**
   * Bulk removes a list of favorites for a specific user (All or Nothing).
   *
   * @param userId The ID of the user.
   * @param ids The list of favorite record IDs to delete.
   * @throws NotFoundException if any of the favorites do not exist or belong to another user.
   */
  async removeBulk(userId: string, ids: string[]): Promise<void> {
    ids = [...new Set(ids)]; // Remove duplicates

    if (!ids || ids.length === 0) return;

    // Start an ACID transaction
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      // 1. Count the valid records within the transaction
      const validRecordCount = await transactionalEntityManager.count(
        Favorite,
        {
          where: {
            id: In(ids),
            user_id: userId,
          },
        },
      );

      // 2. Validate strict compliance (The "Nothing" path)
      if (validRecordCount !== ids.length) {
        // Throwing an error inside the transaction forces a complete rollback
        this.logger.error(
          `Expected to delete ${ids.length} records, but only found ${validRecordCount}. Aborting transaction.`,
        );
        throw new NotFoundException(
          `Expected to delete ${ids.length} records, but only found ${validRecordCount} that belongs to you. - so nothing deleted`,
        );
      }

      // 3. Execute the bulk delete (The "All" path)
      await transactionalEntityManager.delete(Favorite, {
        id: In(ids),
        user_id: userId,
      });
    });
  }
}
