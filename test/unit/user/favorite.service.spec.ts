/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteService } from '../../../src/modules/user/favorite.service';
import { FavoriteRepository } from '../../../src/modules/user/repositories/favorite.repository';
import { DataSource } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
import { FavoriteTargetType } from '../../../src/common/enums/favorite-target-type.enum';
import { FavoriteSortField, SortOrder } from '../../../src/modules/user/dto/favorite-search.dto';
import { ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Favorite } from '../../../src/modules/user/entities/favorite.entity';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let favoriteRepository: any;
  let dataSource: any;
  let logger: any;
  let mockQueryRunner: any;
  let mockTransactionalManager: any;

  beforeEach(async () => {
    // Setup Mock Query Builder
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    // Setup Mock Favorite Repository
    favoriteRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      internalRepo: {
        findOne: jest.fn(),
        find: jest.fn(),
        remove: jest.fn(),
      },
    };

    // Setup Mock QueryRunner for Transaction Testing
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn().mockResolvedValue(undefined),
      },
    };

    // Setup Mock Transactional EntityManager
    mockTransactionalManager = {
      count: jest.fn(),
      delete: jest.fn(),
    };

    // Setup Mock DataSource with transaction support
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      transaction: jest.fn().mockImplementation(async (cb) => {
        return cb(mockTransactionalManager);
      }),
    };

    // Setup Mock Logger
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        { provide: FavoriteRepository, useValue: favoriteRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByUser', () => {
    const userId = 'user-uuid-1';

    it('should retrieve paginated favorites with default created_at DESC sort and stable tie-breaker id ASC sort', async () => {
      const mockFavs: any[] = [
        {
          id: 'fav-1',
          user_id: userId,
          target_type: FavoriteTargetType.TEAM,
          sofa_score_target_id: '1234',
          target_name: 'Arsenal',
          created_at: new Date(),
        },
      ];
      const qb = favoriteRepository.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([mockFavs, 1]);

      const result = await service.findAllByUser(userId, {
        page: 1,
        limit: 10,
      });

      expect(qb.where).toHaveBeenCalledWith('favorite.user_id = :userId', { userId });
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(qb.orderBy).toHaveBeenCalledWith('favorite.created_at', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('favorite.id', 'ASC');

      expect(result.favorites).toHaveLength(1);
      expect(result.favorites[0].target_name).toBe('Arsenal');
      expect(result.total).toBe(1);
    });

    it('should filter by type and name, and sort by target_name ASC', async () => {
      const qb = favoriteRepository.createQueryBuilder();

      await service.findAllByUser(userId, {
        page: 2,
        limit: 5,
        type: FavoriteTargetType.LEAGUE,
        target_name: 'Premier',
        sortBy: FavoriteSortField.TARGET_NAME,
        sortOrder: SortOrder.ASC,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('favorite.target_type = :type', { type: FavoriteTargetType.LEAGUE });
      expect(qb.andWhere).toHaveBeenCalledWith('favorite.target_name ILIKE :targetName', { targetName: '%Premier%' });
      expect(qb.orderBy).toHaveBeenCalledWith('favorite.target_name', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('favorite.created_at', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('favorite.id', 'ASC');
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
    });
  });

  describe('create', () => {
    const userId = 'user-uuid';
    const createDto = {
      target_type: FavoriteTargetType.PLAYER,
      sofa_score_target_id: '9999',
      target_name: 'Messi',
    };

    it('should throw ConflictException if favorite already exists', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue({ id: 'existing-id' });

      await expect(service.create(userId, createDto)).rejects.toThrow(ConflictException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should create and save favorite successfully in a transaction', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      const mockFavorite = { id: 'new-fav-id', ...createDto, user_id: userId };
      mockQueryRunner.manager.create.mockReturnValue(mockFavorite);

      const result = await service.create(userId, createDto);

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(Favorite, {
        where: {
          user_id: userId,
          target_type: createDto.target_type,
          sofa_score_target_id: createDto.sofa_score_target_id,
        },
      });
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(Favorite, {
        user_id: userId,
        target_type: createDto.target_type,
        sofa_score_target_id: createDto.sofa_score_target_id,
        target_name: createDto.target_name,
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(mockFavorite);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual(mockFavorite);
    });

    it('should rollback transaction and throw InternalServerErrorException if DB save fails', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Save Error'));

      await expect(service.create(userId, createDto)).rejects.toThrow(InternalServerErrorException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const userId = 'user-uuid';
    const id = 'fav-uuid';

    it('should throw NotFoundException if favorite does not exist or does not belong to user', async () => {
      favoriteRepository.internalRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(userId, id)).rejects.toThrow(NotFoundException);
    });

    it('should return mapped favorite details successfully', async () => {
      const mockFav = {
        id,
        user_id: userId,
        target_type: FavoriteTargetType.TEAM,
        sofa_score_target_id: '1234',
        target_name: 'Arsenal',
        created_at: new Date(),
      };
      favoriteRepository.internalRepo.findOne.mockResolvedValue(mockFav);

      const result = await service.findOne(userId, id);

      expect(favoriteRepository.internalRepo.findOne).toHaveBeenCalledWith({
        where: { id, user_id: userId },
      });
      expect(result).toEqual({
        id: mockFav.id,
        user_id: mockFav.user_id,
        target_type: mockFav.target_type,
        sofa_score_target_id: mockFav.sofa_score_target_id,
        target_name: mockFav.target_name,
        created_at: mockFav.created_at,
      });
    });
  });

  describe('remove', () => {
    const userId = 'user-uuid';
    const id = 'fav-uuid';

    it('should throw NotFoundException if favorite does not exist or does not belong to user', async () => {
      favoriteRepository.internalRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(userId, id)).rejects.toThrow(NotFoundException);
    });

    it('should remove favorite successfully', async () => {
      const mockFav = { id, user_id: userId };
      favoriteRepository.internalRepo.findOne.mockResolvedValue(mockFav);

      await service.remove(userId, id);

      expect(favoriteRepository.internalRepo.findOne).toHaveBeenCalledWith({
        where: { id, user_id: userId },
      });
      expect(favoriteRepository.internalRepo.remove).toHaveBeenCalledWith(mockFav);
    });
  });

  describe('removeBulk', () => {
    const userId = 'user-uuid';
    const ids = ['uuid-1', 'uuid-2'];

    it('should throw NotFoundException if some favorites do not exist or belong to another user', async () => {
      mockTransactionalManager.count.mockResolvedValue(1); // expected 2, but only found 1

      await expect(service.removeBulk(userId, ids)).rejects.toThrow(NotFoundException);
      expect(mockTransactionalManager.delete).not.toHaveBeenCalled();
    });

    it('should bulk remove favorites successfully', async () => {
      mockTransactionalManager.count.mockResolvedValue(2); // found all 2

      await service.removeBulk(userId, ids);

      expect(mockTransactionalManager.count).toHaveBeenCalledWith(Favorite, {
        where: {
          id: expect.any(Object), // In(ids)
          user_id: userId,
        },
      });
      expect(mockTransactionalManager.delete).toHaveBeenCalledWith(Favorite, {
        id: expect.any(Object), // In(ids)
        user_id: userId,
      });
    });
  });
});
