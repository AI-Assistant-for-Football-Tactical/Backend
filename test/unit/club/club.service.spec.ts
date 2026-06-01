/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ClubService } from '../../../src/modules/club/club.service';
import { ClubRepository } from '../../../src/modules/club/repositories/club.repository';
import { UserRepository } from '../../../src/modules/user/repositories/user.repository';
import { DataSource } from 'typeorm';
import { TeamRole } from '../../../src/common/enums/team-role.enum';
import { ClubStatus } from '../../../src/modules/club/constants/club-status.enum';
import { AuthToken } from '../../../src/modules/auth/entities/token.entity';
import { AuthTokenType } from '../../../src/modules/auth/constants/auth-token-type.enum';
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
        find: jest.fn(),
        findAndCount: jest.fn(),
        findOne: jest.fn(),
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
        find: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
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
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        club_id: null,
      });

      await expect(service.getMyClub({ club_id: null } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user no longer exists', async () => {
      userRepository.findActiveById.mockResolvedValue(null);

      await expect(
        service.getMyClub({ id: 'user-uuid', club_id: 'club-uuid' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if club is not found in database', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        club_id: 'club-uuid',
      });
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
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        club_id: 'club-uuid',
      });
      clubRepository.findNotDeletedById.mockResolvedValue(mockClub);

      const result = await service.getMyClub({ club_id: 'club-uuid' } as any);

      expect(result.id).toBe('club-uuid');
      expect(result.name).toBe('Mock FC');
    });

    it('should use database club_id instead of stale token club_id', async () => {
      const mockClub = {
        id: 'fresh-club-uuid',
        name: 'Fresh FC',
        description: null,
        sofa_score_club_id: '1234',
        logo_url: null,
        owner_id: 'owner-uuid',
        status: ClubStatus.ACTIVE,
        created_at: new Date(),
      };
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        club_id: 'fresh-club-uuid',
      });
      clubRepository.findNotDeletedById.mockResolvedValue(mockClub);

      const result = await service.getMyClub({
        id: 'user-uuid',
        club_id: 'stale-club-uuid',
      } as any);

      expect(clubRepository.findNotDeletedById).toHaveBeenCalledWith(
        'fresh-club-uuid',
      );
      expect(result.id).toBe('fresh-club-uuid');
    });
  });

  describe('listMyClubMembers', () => {
    it('should throw NotFoundException if user is not found', async () => {
      userRepository.findActiveById.mockResolvedValue(null);

      await expect(
        service.listMyClubMembers({ id: 'user-uuid' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user is not in a club', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        club_id: null,
      });

      await expect(
        service.listMyClubMembers({ id: 'user-uuid' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should list active members using database club_id', async () => {
      const mockMembers = [
        {
          id: 'owner-uuid',
          username: 'owner',
          first_name: 'Owner',
          last_name: null,
          profile_image_url: null,
          member_role: TeamRole.OWNER,
        },
        {
          id: 'staff-uuid',
          username: 'staff',
          first_name: 'Staff',
          last_name: 'User',
          profile_image_url: 'avatar.png',
          member_role: TeamRole.STAFF,
        },
      ];
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        club_id: 'fresh-club-uuid',
      });
      userRepository.internalRepo.findAndCount.mockResolvedValue([
        mockMembers,
        2,
      ]);

      const result = await service.listMyClubMembers(
        {
          id: 'user-uuid',
          club_id: 'stale-club-uuid',
        } as any,
        {
          page: 1,
          limit: 10,
        },
      );

      expect(userRepository.internalRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            club_id: 'fresh-club-uuid',
            status: expect.any(String),
          },
          skip: 0,
          take: 10,
        }),
      );
      expect(result.members).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.members[0]).toEqual(
        expect.objectContaining({
          id: 'owner-uuid',
          username: 'owner',
          member_role: TeamRole.OWNER,
        }),
      );
    });

    it('should return one active member from the database club', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        club_id: 'fresh-club-uuid',
      });
      userRepository.internalRepo.findOne.mockResolvedValue({
        id: 'member-uuid',
        username: 'member',
        first_name: 'Member',
        last_name: null,
        profile_image_url: null,
        member_role: TeamRole.STAFF,
      });

      const result = await service.getMyClubMember(
        { id: 'user-uuid', club_id: 'stale-club-uuid' } as any,
        'member-uuid',
      );

      expect(userRepository.internalRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'member-uuid',
            club_id: 'fresh-club-uuid',
            status: expect.any(String),
          },
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'member-uuid',
          member_role: TeamRole.STAFF,
        }),
      );
    });

    it('should throw NotFoundException if member is outside the club', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        club_id: 'club-uuid',
      });
      userRepository.internalRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getMyClubMember({ id: 'user-uuid' } as any, 'member-uuid'),
      ).rejects.toThrow(NotFoundException);
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

    it('should use the database club_id when checking owner leave eligibility', async () => {
      const mockUser = {
        id: 'user-uuid',
        club_id: 'fresh-club-uuid',
        member_role: TeamRole.OWNER,
      };
      userRepository.findActiveById.mockResolvedValue(mockUser);
      userRepository.hasOtherActiveMembers.mockResolvedValue(true);

      await expect(
        service.leaveClub({
          id: 'user-uuid',
          club_id: 'stale-club-uuid',
        } as any),
      ).rejects.toThrow(ForbiddenException);

      expect(userRepository.hasOtherActiveMembers).toHaveBeenCalledWith(
        'fresh-club-uuid',
        'user-uuid',
      );
    });

    it('should throw NotFoundException if database user is no longer in a club', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        club_id: null,
        member_role: TeamRole.OWNER,
      });

      await expect(service.leaveClub(userPayload)).rejects.toThrow(
        NotFoundException,
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
        club_id: 'club-uuid',
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

    it('should use the database owner club_id when validating target membership', async () => {
      userRepository.findActiveById
        .mockResolvedValueOnce({
          id: 'owner-uuid',
          member_role: TeamRole.OWNER,
          club_id: 'fresh-club-uuid',
        })
        .mockResolvedValueOnce({
          id: 'target-uuid',
          club_id: 'fresh-club-uuid',
          member_role: TeamRole.STAFF,
        });
      mockQueryRunner.manager.findOne.mockResolvedValue({
        id: 'fresh-club-uuid',
        owner_id: 'owner-uuid',
      });

      await service.succession(
        { id: 'owner-uuid', club_id: 'stale-club-uuid' } as any,
        'target-uuid',
      );

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(Club, {
        where: { id: 'fresh-club-uuid' },
      });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
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

  describe('removeMember', () => {
    const ownerPayload = { id: 'owner-uuid', club_id: 'club-uuid' } as any;

    it('should throw NotFoundException if owner is not in a club', async () => {
      await expect(
        service.removeMember(
          { id: 'owner-uuid', club_id: null } as any,
          'member-uuid',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if owner tries to remove themselves', async () => {
      await expect(
        service.removeMember(ownerPayload, 'owner-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if requester is not the club OWNER', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'owner-uuid',
        club_id: 'club-uuid',
        member_role: TeamRole.STAFF,
      });

      await expect(
        service.removeMember(ownerPayload, 'member-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if duplicate members are provided', async () => {
      await expect(
        service.removeMembers(ownerPayload, ['member-uuid', 'member-uuid']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'owner-uuid',
        club_id: 'club-uuid',
        member_role: TeamRole.OWNER,
      });
      mockQueryRunner.manager.find.mockResolvedValue([]);

      await expect(
        service.removeMember(ownerPayload, 'member-uuid'),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if target user is outside the club', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'owner-uuid',
        club_id: 'club-uuid',
        member_role: TeamRole.OWNER,
      });
      mockQueryRunner.manager.find.mockResolvedValue([
        {
          id: 'member-uuid',
          club_id: 'other-club-uuid',
          member_role: TeamRole.STAFF,
        },
      ]);

      await expect(
        service.removeMember(ownerPayload, 'member-uuid'),
      ).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should use the database owner club_id when validating removed members', async () => {
      const mockMember: Partial<User> = {
        id: 'member-uuid',
        club_id: 'fresh-club-uuid',
        member_role: TeamRole.STAFF,
      };
      userRepository.findActiveById.mockResolvedValue({
        id: 'owner-uuid',
        club_id: 'fresh-club-uuid',
        member_role: TeamRole.OWNER,
      });
      mockQueryRunner.manager.find.mockResolvedValue([mockMember]);

      await service.removeMembers(
        { id: 'owner-uuid', club_id: 'stale-club-uuid' } as any,
        ['member-uuid'],
      );

      expect(mockMember.club_id).toBeNull();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if target user is not STAFF', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'owner-uuid',
        club_id: 'club-uuid',
        member_role: TeamRole.OWNER,
      });
      mockQueryRunner.manager.find.mockResolvedValue([
        {
          id: 'member-uuid',
          club_id: 'club-uuid',
          member_role: TeamRole.OWNER,
        },
      ]);

      await expect(
        service.removeMember(ownerPayload, 'member-uuid'),
      ).rejects.toThrow(BadRequestException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should unlink STAFF member and invalidate their sessions', async () => {
      const mockMember: Partial<User> = {
        id: 'member-uuid',
        club_id: 'club-uuid',
        member_role: TeamRole.STAFF,
      };

      userRepository.findActiveById.mockResolvedValue({
        id: 'owner-uuid',
        club_id: 'club-uuid',
        member_role: TeamRole.OWNER,
      });
      mockQueryRunner.manager.find.mockResolvedValue([mockMember]);

      await service.removeMember(ownerPayload, 'member-uuid');

      expect(mockMember.club_id).toBeNull();
      expect(mockMember.member_role).toBe(TeamRole.NONE);
      expect(mockMember.last_security_action_at).toBeInstanceOf(Date);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(User, [
        mockMember,
      ]);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should unlink many STAFF members atomically', async () => {
      const mockMembers: Partial<User>[] = [
        {
          id: 'member-uuid',
          club_id: 'club-uuid',
          member_role: TeamRole.STAFF,
        },
        {
          id: 'member-2-uuid',
          club_id: 'club-uuid',
          member_role: TeamRole.STAFF,
        },
      ];

      userRepository.findActiveById.mockResolvedValue({
        id: 'owner-uuid',
        club_id: 'club-uuid',
        member_role: TeamRole.OWNER,
      });
      mockQueryRunner.manager.find.mockResolvedValue(mockMembers);

      await service.removeMembers(ownerPayload, [
        'member-uuid',
        'member-2-uuid',
      ]);

      for (const mockMember of mockMembers) {
        expect(mockMember.club_id).toBeNull();
        expect(mockMember.member_role).toBe(TeamRole.NONE);
        expect(mockMember.last_security_action_at).toBeInstanceOf(Date);
      }
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        User,
        mockMembers,
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
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

  describe('listClubMembersForAdmin', () => {
    it('should throw NotFoundException if club is not found', async () => {
      clubRepository.findNotDeletedById.mockResolvedValue(null);

      await expect(
        service.listClubMembersForAdmin('club-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should list active club members for admins', async () => {
      clubRepository.findNotDeletedById.mockResolvedValue({
        id: 'club-uuid',
      });
      userRepository.internalRepo.findAndCount.mockResolvedValue([
        [
          {
            id: 'member-uuid',
            username: 'member',
            first_name: 'Member',
            last_name: null,
            profile_image_url: null,
            member_role: TeamRole.STAFF,
          },
        ],
        1,
      ]);

      const result = await service.listClubMembersForAdmin('club-uuid', {
        page: 2,
        limit: 5,
      });

      expect(userRepository.internalRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            club_id: 'club-uuid',
            status: expect.any(String),
          },
          skip: 5,
          take: 5,
        }),
      );
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.members).toEqual([
        expect.objectContaining({
          id: 'member-uuid',
          username: 'member',
          member_role: TeamRole.STAFF,
        }),
      ]);
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
      mockQueryRunner.manager.find.mockResolvedValue([]);

      await service.updateClubStatus('club-uuid', {
        status: ClubStatus.ACTIVE,
      });

      expect(mockClub.status).toBe(ClubStatus.ACTIVE);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(Club, mockClub);
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        User,
        { club_id: 'club-uuid' },
        { last_security_action_at: expect.any(Date) },
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should revoke refresh tokens and invalidate member sessions when status changes', async () => {
      const mockClub = { id: 'club-uuid', status: ClubStatus.ACTIVE };
      clubRepository.findNotDeletedById.mockResolvedValue(mockClub);
      mockQueryRunner.manager.find.mockResolvedValue([
        { id: 'member-1' },
        { id: 'member-2' },
      ]);

      await service.updateClubStatus('club-uuid', {
        status: ClubStatus.SUSBENDED,
      });

      expect(mockClub.status).toBe(ClubStatus.SUSBENDED);
      expect(mockQueryRunner.manager.delete).toHaveBeenCalledWith(AuthToken, {
        user_id: expect.any(Object),
        type: AuthTokenType.REFRESH,
      });
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        User,
        { club_id: 'club-uuid' },
        { last_security_action_at: expect.any(Date) },
      );
    });
  });
});
