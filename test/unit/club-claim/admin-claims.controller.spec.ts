/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminClaimsController } from '../../../src/modules/club-claim/controllers/admin-claims.controller';
import { ClubClaimService } from '../../../src/modules/club-claim/club-claim.service';
import { ClaimStatus } from '../../../src/common/enums/claim-status.enum';
import { ClaimReviewAction } from '../../../src/modules/club-claim/enums/claim-review-action.enum';

describe('AdminClaimsController', () => {
  let controller: AdminClaimsController;
  let service: jest.Mocked<ClubClaimService>;

  beforeEach(async () => {
    const mockClubClaimService = {
      listClaims: jest.fn(),
      getClaimDetail: jest.fn(),
      reviewClaim: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminClaimsController],
      providers: [{ provide: ClubClaimService, useValue: mockClubClaimService }],
    }).compile();

    controller = module.get<AdminClaimsController>(AdminClaimsController);
    service = module.get(ClubClaimService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listClaims', () => {
    it('should return paginated list of claims', async () => {
      const query = { status: ClaimStatus.PENDING, page: 1, limit: 10 };
      const expectedResponse = {
        claims: [{ id: 'claim-uuid', status: ClaimStatus.PENDING }],
        total: 1,
        page: 1,
        limit: 10,
      } as any;
      service.listClaims.mockResolvedValue(expectedResponse);

      const result = await controller.listClaims(query);

      expect(result).toEqual(expectedResponse);
      expect(service.listClaims).toHaveBeenCalledWith(query);
    });
  });

  describe('getClaimDetail', () => {
    it('should return claim details', async () => {
      const id = 'claim-uuid';
      const expectedResponse = {
        id: 'claim-uuid',
        club_name: 'Mock FC',
        status: ClaimStatus.PENDING,
        created_at: new Date(),
      } as any;
      service.getClaimDetail.mockResolvedValue(expectedResponse);

      const result = await controller.getClaimDetail(id);

      expect(result).toEqual(expectedResponse);
      expect(service.getClaimDetail).toHaveBeenCalledWith(id);
    });
  });

  describe('reviewClaim', () => {
    it('should call reviewClaim on service on success', async () => {
      const id = 'claim-uuid';
      const reviewer = { id: 'admin-uuid' } as any;
      const dto = { action: ClaimReviewAction.APPROVE, feedback: 'Approved' };
      service.reviewClaim.mockResolvedValue(undefined);

      await controller.reviewClaim(id, reviewer, dto);

      expect(service.reviewClaim).toHaveBeenCalledWith(reviewer, id, dto);
    });
  });
});
