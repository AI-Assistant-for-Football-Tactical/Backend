/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../../src/modules/user/user.service';
import { UserRepository } from '../../../src/modules/user/repositories/user.repository';
import { FavoriteRepository } from '../../../src/modules/user/repositories/favorite.repository';
import { DataSource } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
import { AccountStatus } from '../../../src/common/enums/account-status.enum';
import { TeamRole } from '../../../src/common/enums/team-role.enum';
import { SystemRole } from '../../../src/common/enums/system-role.enum';
import { ClubStatus } from '../../../src/modules/club/constants/club-status.enum';
import { UserSortField } from '../../../src/modules/user/dto/user-search.dto';
import { SortOrder } from '../../../src/common/dtos/pagination.dto';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '../../../src/modules/user/entities/user.entity';

describe('UserService', () => {
  let service: UserService;
  let userRepository: any;
  let favoriteRepository: any;
  let dataSource: any;
  let logger: any;
  let mockQueryRunner: any;

  beforeEach(async () => {
    // Setup Mock Query Builder
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    // Setup Mock User Repository
    userRepository = {
      findActiveById: jest.fn(),
      hasOtherActiveMembers: jest.fn(),
      internalRepo: {
        findOne: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      },
    };

    // Setup Mock Favorite Repository
    favoriteRepository = {
      softDeleteByUserId: jest.fn().mockResolvedValue(undefined),
    };

    // Setup Mock QueryRunner for Transaction Testing
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn().mockResolvedValue(undefined),
        softRemove: jest.fn().mockResolvedValue(undefined),
      },
    };

    // Setup Mock DataSource
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    // Setup Mock Logger
    logger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: userRepository },
        { provide: FavoriteRepository, useValue: favoriteRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchUsers', () => {
    it('should search users and apply sorting on whitelisted created_at field by default', async () => {
      const mockUsers: any[] = [
        {
          id: 'user-id-1',
          email: 'user1@example.com',
          username: 'user1',
          first_name: 'John',
          last_name: 'Doe',
          status: AccountStatus.ACTIVE,
          system_role: SystemRole.ADMIN,
          member_role: TeamRole.OWNER,
          created_at: new Date(),
        },
      ];
      const qb = userRepository.internalRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([mockUsers, 1]);

      const result = await service.searchUsers({
        page: 1,
        limit: 10,
      });

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(qb.orderBy).toHaveBeenCalledWith('user.created_at', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('user.id', 'ASC');
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply custom sorting with whitelisted email field in ASC direction', async () => {
      const qb = userRepository.internalRepo.createQueryBuilder();

      await service.searchUsers({
        page: 2,
        limit: 5,
        sortBy: UserSortField.EMAIL,
        sortOrder: SortOrder.ASC,
      });

      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(qb.orderBy).toHaveBeenCalledWith('user.email', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('user.created_at', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('user.id', 'ASC');
    });
  });

  describe('softDeleteAccount', () => {
    const userId = 'user-uuid-12345';

    it('should throw NotFoundException if user to delete does not exist', async () => {
      userRepository.internalRepo.findOne.mockResolvedValue(null);

      await expect(service.softDeleteAccount(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user is owner of active club and has other members', async () => {
      const mockUser = {
        id: userId,
        member_role: TeamRole.OWNER,
        club_id: 'club-uuid',
        club: {
          id: 'club-uuid',
          owner_id: userId,
          status: ClubStatus.ACTIVE,
          users: [
            { id: userId, status: AccountStatus.ACTIVE },
            { id: 'other-user-id', status: AccountStatus.ACTIVE },
          ],
        },
      } as any;

      userRepository.internalRepo.findOne.mockResolvedValue(mockUser);
      userRepository.hasOtherActiveMembers.mockResolvedValue(true);

      await expect(service.softDeleteAccount(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should soft-delete user and favorites successfully in an ACID transaction (Happy Path)', async () => {
      const mockUser = {
        id: userId,
        email: 'original@example.com',
        username: 'original_user',
        member_role: TeamRole.OWNER,
        club_id: 'club-uuid',
        club: {
          id: 'club-uuid',
          owner_id: userId,
          status: ClubStatus.ACTIVE,
          users: [{ id: userId, status: AccountStatus.ACTIVE }], // only themselves
        },
      } as any;

      userRepository.internalRepo.findOne.mockResolvedValue(mockUser);
      userRepository.hasOtherActiveMembers.mockResolvedValue(false);

      await service.softDeleteAccount(userId);

      // Verify transaction controls are called
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      // Verify fields are updated and anonymized
      expect(mockUser.club_id).toBeNull();
      expect(mockUser.member_role).toBe(TeamRole.NONE);
      expect(mockUser.status).toBe(AccountStatus.SOFT_DELETED);
      expect(mockUser.original_email).toBe('original@example.com');
      expect(mockUser.original_username).toBe('original_user');
      expect(mockUser.username).toContain(`del_user`);
      expect(mockUser.email).toContain(`@deleted.local`);

      // Verify managers saves/softRemoves
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(mockUser);
      expect(mockQueryRunner.manager.softRemove).toHaveBeenCalledWith(mockUser);

      // Verify favorites deletion is called within the transaction
      expect(favoriteRepository.softDeleteByUserId).toHaveBeenCalledWith(
        userId,
        mockQueryRunner.manager,
      );
    });

    it('should rollback transaction and throw InternalServerErrorException if saving user fails', async () => {
      const mockUser = {
        id: userId,
        email: 'original@example.com',
        username: 'original_user',
        member_role: null,
        club_id: null,
      } as any;

      userRepository.internalRepo.findOne.mockResolvedValue(mockUser);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.softDeleteAccount(userId)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findOneByIdOrFail', () => {
    const userId = 'user-uuid-1';

    it('should throw NotFoundException if user is not found', async () => {
      userRepository.findActiveById.mockResolvedValue(null);

      await expect(
        service.findOneByIdOrFail(userId, { sys_role: SystemRole.USER } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if requester is normal USER but target is ADMIN', async () => {
      const mockAdmin = {
        id: userId,
        system_role: SystemRole.ADMIN,
      };
      userRepository.findActiveById.mockResolvedValue(mockAdmin);

      await expect(
        service.findOneByIdOrFail(userId, { sys_role: SystemRole.USER } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully return profile if requester is normal USER and target is also USER', async () => {
      const mockUser = {
        id: userId,
        email: 'john@example.com',
        username: 'john',
        first_name: 'John',
        last_name: 'Doe',
        status: AccountStatus.ACTIVE,
        system_role: SystemRole.USER,
        member_role: TeamRole.OWNER,
        created_at: new Date(),
      };
      userRepository.findActiveById.mockResolvedValue(mockUser);

      const result = await service.findOneByIdOrFail(userId, {
        sys_role: SystemRole.USER,
      } as any);

      expect(result.id).toBe(userId);
      expect(result.email).toBe('john@example.com');
    });

    it('should successfully return profile if requester is ADMIN and target is also ADMIN', async () => {
      const mockAdmin = {
        id: userId,
        email: 'admin@example.com',
        username: 'admin',
        first_name: 'Admin',
        last_name: 'One',
        status: AccountStatus.ACTIVE,
        system_role: SystemRole.ADMIN,
        member_role: TeamRole.OWNER,
        created_at: new Date(),
      };
      userRepository.findActiveById.mockResolvedValue(mockAdmin);

      const result = await service.findOneByIdOrFail(userId, {
        sys_role: SystemRole.ADMIN,
      } as any);

      expect(result.id).toBe(userId);
      expect(result.email).toBe('admin@example.com');
    });
  });
});
