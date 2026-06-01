/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ClubService } from '../../../src/modules/club/club.service';
import { ClubRepository } from '../../../src/modules/club/repositories/club.repository';
import { UserRepository } from '../../../src/modules/user/repositories/user.repository';
import { DataSource } from 'typeorm';
import { TeamRole } from '../../../src/common/enums/team-role.enum';
import { ClubStatus } from '../../../src/modules/club/constants/club-status.enum';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Club } from '../../../src/modules/club/entities/club.entity';
import { User } from '../../../src/modules/user/entities/user.entity';

describe('ClubService', () => {
  let service: ClubService;
  let clubRepository: any;
  let userRepository: any;
  let dataSource: any;
  let mockQueryRunner: any;

  beforeEach(async () => {
    // Setup Mock Club Repository
    clubRepository = {
      findNotDeletedById: jest.fn(),
      internalRepo: {
        findAndCount: jest.fn(),
        save: jest.fn(),
      },
    };

    // Setup Mock User Repository
    userRepository = {
      findActiveById: jest.fn(),
      hasOtherActiveMembers: jest.fn(),
      internalRepo: {
        save: jest.fn(),
        update: jest.fn(),
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
        save: jest.fn().mockResolvedValue(undefined),
        softRemove: jest.fn().mockResolvedValue(undefined),
      },
    };

    // Setup Mock DataSource
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubService,
        { provide: ClubRepository, useValue: clubRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ClubService>(ClubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyClub', () => {
    it('should throw NotFoundException if user has no club_id in payload', async () => {
      await expect(service.getMyClub({ club_id: null } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if club is not found in database', async () => {
      clubRepository.findNotDeletedById.mockResolvedValue(null);

      await expect(
        service.getMyClub({ club_id: 'club-uuid' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return club response DTO if club is found', async () => {
      const mockClub = {
        id: 'club-uuid',
        name: 'Mock FC',
        description: 'Mock Club Description',
        sofa_score_club_id: 1234,
        logo_url: 'logo.png',
        owner_id: 'owner-uuid',
        status: ClubStatus.ACTIVE,
        created_at: new Date(),
      };
      clubRepository.findNotDeletedById.mockResolvedValue(mockClub);

      const result = await service.getMyClub({ club_id: 'club-uuid' } as any);

      expect(result.id).toBe('club-uuid');
      expect(result.name).toBe('Mock FC');
    });
  });

  describe('leaveClub', () => {
    const userPayload = { id: 'user-uuid', club_id: 'club-uuid' } as any;

    it('should throw NotFoundException if user has no club_id', async () => {
      await expect(
        service.leaveClub({ id: 'user-uuid', club_id: null } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user is not found in database', async () => {
      userRepository.findActiveById.mockResolvedValue(null);

      await expect(service.leaveClub(userPayload)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should unlink STAFF member immediately without dissolving club', async () => {
      const mockUser = {
        id: 'user-uuid',
        club_id: 'club-uuid',
        member_role: TeamRole.STAFF,
      };
      userRepository.findActiveById.mockResolvedValue(mockUser);

      await service.leaveClub(userPayload);

      expect(mockUser.club_id).toBeNull();
      expect(mockUser.member_role).toBe(TeamRole.NONE);
      expect(userRepository.internalRepo.save).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ForbiddenException if OWNER tries to leave but has remaining staff', async () => {
      const mockUser = {
        id: 'user-uuid',
        club_id: 'club-uuid',
        member_role: TeamRole.OWNER,
      };
      userRepository.findActiveById.mockResolvedValue(mockUser);
      userRepository.hasOtherActiveMembers.mockResolvedValue(true);

      await expect(service.leaveClub(userPayload)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should dissolve club atomically if lone OWNER leaves', async () => {
      const mockUser = {
        id: 'user-uuid',
        club_id: 'club-uuid',
        member_role: TeamRole.OWNER,
      };
      const mockClub = {
        id: 'club-uuid',
        status: ClubStatus.ACTIVE,
      };
      userRepository.findActiveById.mockResolvedValue(mockUser);
      userRepository.hasOtherActiveMembers.mockResolvedValue(false);
      mockQueryRunner.manager.findOne.mockResolvedValue(mockClub);

      await service.leaveClub(userPayload);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockClub.status).toBe(ClubStatus.SOFT_DELETED);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(Club, mockClub);
      expect(mockQueryRunner.manager.softRemove).toHaveBeenCalledWith(
        Club,
        mockClub,
      );
      expect(mockUser.club_id).toBeNull();
      expect(mockUser.member_role).toBe(TeamRole.NONE);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(User, mockUser);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction and throw error if dissolution fails', async () => {
      const mockUser = {
        id: 'user-uuid',
        club_id: 'club-uuid',
        member_role: TeamRole.OWNER,
      };
      userRepository.findActiveById.mockResolvedValue(mockUser);
      userRepository.hasOtherActiveMembers.mockResolvedValue(false);
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('DB Error'));

      await expect(service.leaveClub(userPayload)).rejects.toThrow('DB Error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('succession', () => {
    const ownerPayload = { id: 'owner-uuid', club_id: 'club-uuid' } as any;

    it('should throw NotFoundException if user is not in a club', async () => {
      await expect(
        service.succession(
          { id: 'owner-uuid', club_id: null } as any,
          'target-uuid',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if current user is not found or is not OWNER', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'owner-uuid',
        member_role: TeamRole.STAFF,
      });

      await expect(
        service.succession(ownerPayload, 'target-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if target user is not found', async () => {
      userRepository.findActiveById
        .mockResolvedValueOnce({
          id: 'owner-uuid',
          member_role: TeamRole.OWNER,
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.succession(ownerPayload, 'target-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if target user belongs to a different club', async () => {
      userRepository.findActiveById
        .mockResolvedValueOnce({
          id: 'owner-uuid',
          member_role: TeamRole.OWNER,
          club_id: 'club-uuid',
        })
        .mockResolvedValueOnce({
          id: 'target-uuid',
          club_id: 'different-club-uuid',
        });

      await expect(
        service.succession(ownerPayload, 'target-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if target user is not a STAFF member', async () => {
      userRepository.findActiveById
        .mockResolvedValueOnce({
          id: 'owner-uuid',
          member_role: TeamRole.OWNER,
          club_id: 'club-uuid',
        })
        .mockResolvedValueOnce({
          id: 'target-uuid',
          club_id: 'club-uuid',
          member_role: TeamRole.NONE,
        });

      await expect(
        service.succession(ownerPayload, 'target-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transfer ownership atomically on happy path', async () => {
      const mockOwner = {
        id: 'owner-uuid',
        member_role: TeamRole.OWNER,
        club_id: 'club-uuid',
      };
      const mockTarget = {
        id: 'target-uuid',
        member_role: TeamRole.STAFF,
        club_id: 'club-uuid',
      };
      const mockClub = { id: 'club-uuid', owner_id: 'owner-uuid' };

      userRepository.findActiveById
        .mockResolvedValueOnce(mockOwner)
        .mockResolvedValueOnce(mockTarget);
      mockQueryRunner.manager.findOne.mockResolvedValue(mockClub);

      await service.succession(ownerPayload, 'target-uuid');

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockClub.owner_id).toBe('target-uuid');
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(Club, mockClub);
      expect(mockOwner.member_role).toBe(TeamRole.STAFF);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        User,
        mockOwner,
      );
      expect(mockTarget.member_role).toBe(TeamRole.OWNER);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        User,
        mockTarget,
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('listClubs', () => {
    it('should return a paginated and filtered list of clubs', async () => {
      const mockClubs = [
        { id: 'club-1', name: 'Mock Club A' },
        { id: 'club-2', name: 'Mock Club B' },
      ];
      clubRepository.internalRepo.findAndCount.mockResolvedValue([
        mockClubs,
        2,
      ]);

      const result = await service.listClubs({
        name: 'Mock',
        page: 1,
        limit: 10,
      });

      expect(result.clubs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(clubRepository.internalRepo.findAndCount).toHaveBeenCalled();
    });
  });

  describe('updateClubStatus', () => {
    it('should throw NotFoundException if club is not found', async () => {
      clubRepository.findNotDeletedById.mockResolvedValue(null);

      await expect(
        service.updateClubStatus('club-uuid', { status: ClubStatus.ACTIVE }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update club status', async () => {
      const mockClub = { id: 'club-uuid', status: ClubStatus.INACTIVE };
      clubRepository.findNotDeletedById.mockResolvedValue(mockClub);

      await service.updateClubStatus('club-uuid', {
        status: ClubStatus.ACTIVE,
      });

      expect(mockClub.status).toBe(ClubStatus.ACTIVE);
      expect(clubRepository.internalRepo.save).toHaveBeenCalledWith(mockClub);
    });

    it('should invalidate member sessions if club is suspended', async () => {
      const mockClub = { id: 'club-uuid', status: ClubStatus.ACTIVE };
      clubRepository.findNotDeletedById.mockResolvedValue(mockClub);

      await service.updateClubStatus('club-uuid', {
        status: ClubStatus.SUSBENDED,
      });

      expect(mockClub.status).toBe(ClubStatus.SUSBENDED);
      expect(userRepository.internalRepo.update).toHaveBeenCalledWith(
        { club_id: 'club-uuid' },
        expect.any(Object),
      );
    });
  });
});
