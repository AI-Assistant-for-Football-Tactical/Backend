/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ClubClaimService } from '../../../src/modules/club-claim/club-claim.service';
import { ClaimRepository } from '../../../src/modules/club-claim/repositories/claim.repository';
import { UserRepository } from '../../../src/modules/user/repositories/user.repository';
import { DataSource } from 'typeorm';
import { ClaimStatus } from '../../../src/common/enums/claim-status.enum';
import { ClaimReviewAction } from '../../../src/modules/club-claim/enums/claim-review-action.enum';
import { ClubStatus } from '../../../src/modules/club/constants/club-status.enum';
import { TeamRole } from '../../../src/common/enums/team-role.enum';
import { InvitationStatus } from '../../../src/modules/invitation/constants/invitation-status.enum';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Claim } from '../../../src/modules/club-claim/entities/claim.entity';
import { Club } from '../../../src/modules/club/entities/club.entity';
import { User } from '../../../src/modules/user/entities/user.entity';
import { Invitation } from '../../../src/modules/invitation/entities/invitation.entity';

describe('ClubClaimService', () => {
  let service: ClubClaimService;
  let claimRepository: any;
  let userRepository: any;
  let dataSource: any;
  let mockQueryRunner: any;

  beforeEach(async () => {
    // Setup Mock Claim Repository
    claimRepository = {
      getRecentClaim: jest.fn(),
      findById: jest.fn(),
      internalRepo: {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
      },
    };

    // Setup Mock User Repository
    userRepository = {
      findActiveById: jest.fn(),
    };

    // Setup Mock QueryRunner for Transaction Testing
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        create: jest.fn(),
        save: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };

    // Setup Mock DataSource
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubClaimService,
        { provide: ClaimRepository, useValue: claimRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ClubClaimService>(ClubClaimService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitClaim', () => {
    const userPayload = { id: 'user-uuid' } as any;
    const submitDto = {
      external_club_id: '1234',
      club_name: 'Mock FC',
      justification: 'I am the owner.',
      document_urls: ['doc1.pdf'],
    };

    it('should throw NotFoundException if claimant user does not exist or is inactive', async () => {
      userRepository.findActiveById.mockResolvedValue(null);

      await expect(service.submitClaim(userPayload, submitDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user is not verified', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        is_verified: false,
      });

      await expect(service.submitClaim(userPayload, submitDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if user already belongs to a club', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        is_verified: true,
        club_id: 'existing-club-id',
      });

      await expect(service.submitClaim(userPayload, submitDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if user has a pending or under-review claim', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        is_verified: true,
        club_id: null,
      });
      claimRepository.internalRepo.findOne.mockResolvedValue({
        id: 'claim-uuid',
        status: ClaimStatus.PENDING,
      });

      await expect(service.submitClaim(userPayload, submitDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if target club already exists in system', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        is_verified: true,
        club_id: null,
      });
      claimRepository.internalRepo.findOne.mockResolvedValue(null);
      dataSource.getRepository().findOne.mockResolvedValue({
        id: 'club-uuid',
        name: 'Mock FC',
      });

      await expect(service.submitClaim(userPayload, submitDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should successfully submit and save claim on happy path', async () => {
      userRepository.findActiveById.mockResolvedValue({
        id: 'user-uuid',
        is_verified: true,
        club_id: null,
      });
      claimRepository.internalRepo.findOne.mockResolvedValue(null);
      dataSource.getRepository().findOne.mockResolvedValue(null);

      const mockClaim = {
        id: 'new-claim-uuid',
        user_id: 'user-uuid',
        club_name: 'Mock FC',
        sofa_score_team_id: '1234',
        justification: 'I am the owner.',
        document_urls: ['doc1.pdf'],
        status: ClaimStatus.PENDING,
        created_at: new Date(),
      };
      claimRepository.internalRepo.create.mockReturnValue(mockClaim);
      claimRepository.internalRepo.save.mockResolvedValue(mockClaim);

      const result = await service.submitClaim(userPayload, submitDto);

      expect(result.id).toBe('new-claim-uuid');
      expect(result.status).toBe(ClaimStatus.PENDING);
      expect(claimRepository.internalRepo.create).toHaveBeenCalled();
      expect(claimRepository.internalRepo.save).toHaveBeenCalledWith(mockClaim);
    });
  });

  describe('getMyRecentClaim', () => {
    it('should throw NotFoundException if no claim is found for the user', async () => {
      claimRepository.getRecentClaim.mockResolvedValue(null);

      await expect(
        service.getMyRecentClaim({ id: 'user-uuid' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return claim status response if found', async () => {
      const mockClaim = {
        id: 'claim-uuid',
        status: ClaimStatus.PENDING,
        created_at: new Date(),
      };
      claimRepository.getRecentClaim.mockResolvedValue(mockClaim);

      const result = await service.getMyRecentClaim({ id: 'user-uuid' } as any);

      expect(result.id).toBe('claim-uuid');
      expect(result.status).toBe(ClaimStatus.PENDING);
    });
  });

  describe('cancelMyRecentClaim', () => {
    it('should throw NotFoundException if no claim is found', async () => {
      claimRepository.getRecentClaim.mockResolvedValue(null);

      await expect(
        service.cancelMyRecentClaim({ id: 'user-uuid' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if latest claim is not PENDING', async () => {
      claimRepository.getRecentClaim.mockResolvedValue({
        id: 'claim-uuid',
        status: ClaimStatus.APPROVED,
      });

      await expect(
        service.cancelMyRecentClaim({ id: 'user-uuid' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mark claim as REVOKED and save on happy path', async () => {
      const mockClaim = {
        id: 'claim-uuid',
        status: ClaimStatus.PENDING,
      };
      claimRepository.getRecentClaim.mockResolvedValue(mockClaim);

      await service.cancelMyRecentClaim({ id: 'user-uuid' } as any);

      expect(mockClaim.status).toBe(ClaimStatus.REVOKED);
      expect(claimRepository.internalRepo.save).toHaveBeenCalledWith(mockClaim);
    });
  });

  describe('getClaimDetail', () => {
    it('should throw NotFoundException if claim is not found', async () => {
      claimRepository.findById.mockResolvedValue(null);

      await expect(service.getClaimDetail('claim-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return claim details if found', async () => {
      const mockClaim = {
        id: 'claim-uuid',
        club_name: 'Mock FC',
        status: ClaimStatus.PENDING,
        created_at: new Date(),
      };
      claimRepository.findById.mockResolvedValue(mockClaim);

      const result = await service.getClaimDetail('claim-uuid');

      expect(result.id).toBe('claim-uuid');
      expect(result.club_name).toBe('Mock FC');
    });
  });

  describe('reviewClaim', () => {
    const reviewerPayload = { id: 'admin-uuid' } as any;

    it('should throw NotFoundException if claim is not found', async () => {
      claimRepository.findById.mockResolvedValue(null);

      await expect(
        service.reviewClaim(reviewerPayload, 'claim-uuid', {
          action: ClaimReviewAction.REJECT,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if claim is not PENDING', async () => {
      claimRepository.findById.mockResolvedValue({
        id: 'claim-uuid',
        status: ClaimStatus.APPROVED,
      });

      await expect(
        service.reviewClaim(reviewerPayload, 'claim-uuid', {
          action: ClaimReviewAction.REJECT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if claimant user is missing from claim', async () => {
      claimRepository.findById.mockResolvedValue({
        id: 'claim-uuid',
        status: ClaimStatus.PENDING,
        user: null,
      });

      await expect(
        service.reviewClaim(reviewerPayload, 'claim-uuid', {
          action: ClaimReviewAction.REJECT,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    describe('REJECT Action', () => {
      it('should mark claim as REJECTED with feedback reason and save', async () => {
        const mockClaim = {
          id: 'claim-uuid',
          status: ClaimStatus.PENDING,
          user: { id: 'user-uuid' },
          reviewer_id: null,
          reviewed_at: null,
          rejection_reason: null,
        };
        claimRepository.findById.mockResolvedValue(mockClaim);

        await service.reviewClaim(reviewerPayload, 'claim-uuid', {
          action: ClaimReviewAction.REJECT,
          feedback: 'Poor documentation.',
        });

        expect(mockClaim.status).toBe(ClaimStatus.REJECTED);
        expect(mockClaim.reviewer_id).toBe('admin-uuid');
        expect(mockClaim.rejection_reason).toBe('Poor documentation.');
        expect(claimRepository.internalRepo.save).toHaveBeenCalledWith(
          mockClaim,
        );
      });
    });

    describe('APPROVE Action', () => {
      it('should throw ConflictException if user already has a club', async () => {
        claimRepository.findById.mockResolvedValue({
          id: 'claim-uuid',
          status: ClaimStatus.PENDING,
          user: { id: 'user-uuid', club_id: 'some-club-id' },
        });

        await expect(
          service.reviewClaim(reviewerPayload, 'claim-uuid', {
            action: ClaimReviewAction.APPROVE,
          }),
        ).rejects.toThrow(ConflictException);
      });

      it('should atomically create club, elevate user, and approve claim in ACID transaction', async () => {
        const mockClaim = {
          id: 'claim-uuid',
          status: ClaimStatus.PENDING,
          club_name: 'Mock FC',
          sofa_score_team_id: '1234',
          document_urls: ['doc1.png'],
          user: { id: 'user-uuid', club_id: null, member_role: TeamRole.NONE },
          reviewer_id: null,
          reviewed_at: null,
        };
        const mockClub = { id: 'new-club-uuid', name: 'Mock FC' };

        claimRepository.findById.mockResolvedValue(mockClaim);
        mockQueryRunner.manager.create.mockReturnValue(mockClub);
        mockQueryRunner.manager.save.mockResolvedValueOnce(mockClub); // save club

        await service.reviewClaim(reviewerPayload, 'claim-uuid', {
          action: ClaimReviewAction.APPROVE,
        });

        expect(mockQueryRunner.connect).toHaveBeenCalled();
        expect(mockQueryRunner.startTransaction).toHaveBeenCalled();

        // Check club creation
        expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(Club, {
          name: 'Mock FC',
          sofa_score_club_id: '1234',
          creator_id: 'user-uuid',
          owner_id: 'user-uuid',
          status: ClubStatus.ACTIVE,
          logo_url: 'doc1.png',
        });
        expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
          Club,
          mockClub,
        );

        // Check user elevation
        expect(mockClaim.user.club_id).toBe('new-club-uuid');
        expect(mockClaim.user.member_role).toBe(TeamRole.OWNER);
        expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
          User,
          mockClaim.user,
        );

        // Check claim approval
        expect(mockClaim.status).toBe(ClaimStatus.APPROVED);
        expect(mockClaim.reviewer_id).toBe('admin-uuid');
        expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
          Claim,
          mockClaim,
        );

        // Check invitations revocation
        expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
          Invitation,
          { to_user_id: 'user-uuid', status: InvitationStatus.PENDING },
          expect.any(Object),
        );

        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });

      it('should rollback transaction if approval step fails', async () => {
        const mockClaim = {
          id: 'claim-uuid',
          status: ClaimStatus.PENDING,
          club_name: 'Mock FC',
          sofa_score_team_id: '1234',
          document_urls: ['doc1.png'],
          user: { id: 'user-uuid', club_id: null, member_role: TeamRole.NONE },
        };
        claimRepository.findById.mockResolvedValue(mockClaim);
        mockQueryRunner.manager.create.mockImplementation(() => {
          throw new Error('Transaction DB Failure');
        });

        await expect(
          service.reviewClaim(reviewerPayload, 'claim-uuid', {
            action: ClaimReviewAction.APPROVE,
          }),
        ).rejects.toThrow('Transaction DB Failure');

        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });
    });
  });
});
