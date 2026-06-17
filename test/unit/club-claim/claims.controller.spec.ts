/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ClaimsController } from '../../../src/modules/club-claim/controllers/claims.controller';
import { ClubClaimService } from '../../../src/modules/club-claim/club-claim.service';
import { ClaimStatus } from '../../../src/common/enums/claim-status.enum';

describe('ClaimsController', () => {
  let controller: ClaimsController;
  let service: jest.Mocked<ClubClaimService>;

  beforeEach(async () => {
    const mockClubClaimService = {
      submitClaim: jest.fn(),
      getMyRecentClaim: jest.fn(),
      cancelMyRecentClaim: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClaimsController],
      providers: [{ provide: ClubClaimService, useValue: mockClubClaimService }],
    }).compile();

    controller = module.get<ClaimsController>(ClaimsController);
    service = module.get(ClubClaimService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('submitClaim', () => {
    it('should submit a claim successfully', async () => {
      const user = { id: 'user-uuid' } as any;
      const dto = {
        external_club_id: '123',
        club_name: 'Mock FC',
        justification: 'Owner',
        document_urls: ['doc.pdf'],
      };
      const expectedResponse = {
        id: 'claim-uuid',
        status: ClaimStatus.PENDING,
        created_at: new Date(),
      } as any;
      service.submitClaim.mockResolvedValue(expectedResponse);

      const result = await controller.submitClaim(user, dto);

      expect(result).toEqual(expectedResponse);
      expect(service.submitClaim).toHaveBeenCalledWith(user, dto);
    });
  });

  describe('getMyRecentClaim', () => {
    it('should return recent claim details', async () => {
      const user = { id: 'user-uuid' } as any;
      const expectedResponse = {
        id: 'claim-uuid',
        status: ClaimStatus.PENDING,
        created_at: new Date(),
      } as any;
      service.getMyRecentClaim.mockResolvedValue(expectedResponse);

      const result = await controller.getMyRecentClaim(user);

      expect(result).toEqual(expectedResponse);
      expect(service.getMyRecentClaim).toHaveBeenCalledWith(user);
    });
  });

  describe('cancelMyRecentClaim', () => {
    it('should call service cancelMyRecentClaim', async () => {
      const user = { id: 'user-uuid' } as any;
      service.cancelMyRecentClaim.mockResolvedValue(undefined);

      await controller.cancelMyRecentClaim(user);

      expect(service.cancelMyRecentClaim).toHaveBeenCalledWith(user);
    });
  });
});
