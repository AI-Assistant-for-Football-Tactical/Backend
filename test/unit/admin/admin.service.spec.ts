/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AdminService } from '../../../src/modules/admin/admin.service';
import { UserRepository } from '../../../src/modules/user/repositories/user.repository';
import { ClaimRepository } from '../../../src/modules/club-claim/repositories/claim.repository';
import { ClubRepository } from '../../../src/modules/club/repositories/club.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SystemRole } from '../../../src/common/enums/system-role.enum';
import { AccountStatus } from '../../../src/common/enums/account-status.enum';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AccessTokenPayload } from '../../../src/modules/auth/constants/token-payload.type';
import { UserService } from '../../../src/modules/user/user.service';

describe('AdminService', () => {
  let service: AdminService;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let userRepository: any;
  let claimRepository: any;
  let clubRepository: any;
  let userService: any;

  beforeEach(async () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    userRepository = {
      internalRepo: {
        update: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      },
    };

    claimRepository = {
      internalRepo: {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      },
    };

    clubRepository = {
      internalRepo: {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: UserRepository, useValue: userRepository },
        { provide: ClaimRepository, useValue: claimRepository },
        { provide: ClubRepository, useValue: clubRepository },
        { provide: DataSource, useValue: {} },
        {
          provide: UserService,
          useValue: {
            searchUsers: jest.fn(),
            updateUserStatus: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    eventEmitter = module.get(EventEmitter2);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('promoteUser', () => {
    const targetUserId = 'target-uuid';

    it('should throw NotFoundException if user is not found during promotion', async () => {
      const requester = {
        id: 'super-admin-uuid',
        sys_role: SystemRole.SUPER_ADMIN,
      } as AccessTokenPayload;
      userRepository.internalRepo.findOne.mockResolvedValue(null);

      await expect(
        service.promoteUser(requester, targetUserId, {
          role: SystemRole.REVIEWER,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if an ADMIN tries to promote someone to ADMIN', async () => {
      const requester = {
        id: 'admin-uuid',
        sys_role: SystemRole.ADMIN,
      } as AccessTokenPayload;
      userRepository.internalRepo.findOne.mockResolvedValue({
        id: targetUserId,
        system_role: SystemRole.REVIEWER,
      });

      await expect(
        service.promoteUser(requester, targetUserId, {
          role: SystemRole.ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'admin.security-violation',
        expect.any(Object),
      );
    });

    it('should throw ForbiddenException if an ADMIN tries to promote someone to SUPER_ADMIN', async () => {
      const requester = {
        id: 'admin-uuid',
        sys_role: SystemRole.ADMIN,
      } as AccessTokenPayload;
      userRepository.internalRepo.findOne.mockResolvedValue({
        id: targetUserId,
        system_role: SystemRole.REVIEWER,
      });

      await expect(
        service.promoteUser(requester, targetUserId, {
          role: SystemRole.SUPER_ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'admin.security-violation',
        expect.any(Object),
      );
    });

    it('should throw ForbiddenException if user tries to modify a higher system role user', async () => {
      const requester = {
        id: 'admin-uuid',
        sys_role: SystemRole.ADMIN,
      } as AccessTokenPayload;
      userRepository.internalRepo.findOne.mockResolvedValue({
        id: targetUserId,
        system_role: SystemRole.SUPER_ADMIN,
      });

      await expect(
        service.promoteUser(requester, targetUserId, {
          role: SystemRole.REVIEWER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow self-downgrade', async () => {
      const requester = {
        id: 'super-admin-uuid',
        sys_role: SystemRole.SUPER_ADMIN,
      } as AccessTokenPayload;
      userRepository.internalRepo.findOne.mockResolvedValue({
        id: 'super-admin-uuid',
        system_role: SystemRole.SUPER_ADMIN,
      });
      userRepository.internalRepo.update.mockResolvedValue({ affected: 1 });

      await service.promoteUser(requester, 'super-admin-uuid', {
        role: SystemRole.ADMIN,
      });

      expect(userRepository.internalRepo.update).toHaveBeenCalledWith(
        'super-admin-uuid',
        {
          system_role: SystemRole.ADMIN,
          last_security_action_at: expect.any(Date),
        },
      );
    });

    it('should forbid self-upgrade', async () => {
      const requester = {
        id: 'admin-uuid',
        sys_role: SystemRole.ADMIN,
      } as AccessTokenPayload;
      userRepository.internalRepo.findOne.mockResolvedValue({
        id: 'admin-uuid',
        system_role: SystemRole.ADMIN,
      });

      await expect(
        service.promoteUser(requester, 'admin-uuid', {
          role: SystemRole.SUPER_ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should promote user successfully and emit event', async () => {
      const requester = {
        id: 'super-admin-uuid',
        sys_role: SystemRole.SUPER_ADMIN,
      } as AccessTokenPayload;
      userRepository.internalRepo.findOne.mockResolvedValue({
        id: targetUserId,
        system_role: SystemRole.REVIEWER,
      });
      userRepository.internalRepo.update.mockResolvedValue({ affected: 1 });

      await service.promoteUser(requester, targetUserId, {
        role: SystemRole.ADMIN,
      });

      expect(userRepository.internalRepo.update).toHaveBeenCalledWith(
        targetUserId,
        {
          system_role: SystemRole.ADMIN,
          last_security_action_at: expect.any(Date),
        },
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('admin.promoted', {
        targetUserId,
        newRole: SystemRole.ADMIN,
        adminId: requester.id,
      });
    });
  });


  describe('searchUsers', () => {
    it('should return paginated users', async () => {
      const mockResult = { users: [], total: 0, page: 1, limit: 10 };
      (userService.searchUsers as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.searchUsers({
        page: 1,
        limit: 10,
        email: 'test',
      });

      expect(userService.searchUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        email: 'test',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('searchClaims', () => {
    it('should return paginated claims', async () => {
      const result = await service.searchClaims({ page: 1, limit: 10 });

      expect(
        claimRepository.internalRepo.createQueryBuilder,
      ).toHaveBeenCalledWith('claim');
      expect(result).toEqual({ claims: [], total: 0, page: 1, limit: 10 });
    });
  });

  describe('searchClubs', () => {
    it('should return paginated clubs', async () => {
      const result = await service.searchClubs({ page: 1, limit: 10 });

      expect(
        clubRepository.internalRepo.createQueryBuilder,
      ).toHaveBeenCalledWith('club');
      expect(result).toEqual({ clubs: [], total: 0, page: 1, limit: 10 });
    });
  });
});
