import { Test, TestingModule } from '@nestjs/testing';
import { AdminInvitationsController } from '../../../src/modules/invitation/admin-invitation.controller';
import { InvitationService } from '../../../src/modules/invitation/invitation.service';
import { InvitationSearchQueryDto } from '../../../src/modules/invitation/dto/invitation-search-query.dto';
import { PaginatedAdminInvitationsResponseDto } from '../../../src/modules/invitation/dto/invitation-response.dto';

// Mock ConfigModule
jest.mock('@nestjs/config', () => ({
  ConfigModule: {
    forRoot: jest.fn().mockReturnValue({ module: class {} }),
  },
  ConfigService: class {
    get() {
      return null;
    }
  },
}));

// Mock core config
jest.mock('../../../src/core/config', () => ({
  AppConfig: class {
    baseUrl = 'http://localhost';
    apiPrefix = 'api/v1';
  },
}));

describe('AdminInvitationsController', () => {
  let controller: AdminInvitationsController;
  let listAllInvitesForAdmin: jest.MockedFunction<
    InvitationService['listAllInvitesForAdmin']
  >;

  beforeEach(async () => {
    listAllInvitesForAdmin = jest.fn();
    const mockInvitationService = {
      listAllInvitesForAdmin,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminInvitationsController],
      providers: [
        { provide: InvitationService, useValue: mockInvitationService },
      ],
    }).compile();

    controller = module.get<AdminInvitationsController>(
      AdminInvitationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listAllInvitesForAdmin', () => {
    it('should delegate to service.listAllInvitesForAdmin', async () => {
      const query: InvitationSearchQueryDto = { page: 1, limit: 10 };
      const expectedResponse = new PaginatedAdminInvitationsResponseDto();
      expectedResponse.invitations = [];
      expectedResponse.total = 0;
      expectedResponse.page = 1;
      expectedResponse.limit = 10;
      listAllInvitesForAdmin.mockResolvedValue(expectedResponse);

      const result = await controller.listAllInvitesForAdmin(query);

      expect(result).toEqual(expectedResponse);
      expect(listAllInvitesForAdmin).toHaveBeenCalledWith(query);
    });
  });
});
