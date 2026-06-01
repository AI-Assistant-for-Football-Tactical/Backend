/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from '../../../src/modules/admin/admin.controller';
import { AdminService } from '../../../src/modules/admin/admin.service';
import { PromoteUserDto } from '../../../src/modules/admin/dtos/promote-user.dto';
import { ClaimSearchQueryDto } from '../../../src/modules/admin/dtos/claim-search-query.dto';
import { SystemRole } from '../../../src/common/enums/system-role.enum';
import type { AccessTokenPayload } from '../../../src/modules/auth/constants/token-payload.type';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;

  beforeEach(async () => {
    const mockAdminService = {
      promoteUser: jest.fn(),
      searchClaims: jest.fn(),
      searchClubs: jest.fn(),
      revokeRefreshTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('promoteUser', () => {
    it('should call adminService.promoteUser with correct arguments', async () => {
      const id = 'test-uuid';
      const requester = { id: 'admin-uuid' } as AccessTokenPayload;
      const dto: PromoteUserDto = { role: SystemRole.ADMIN };

      await controller.promoteUser(id, requester, dto);

      expect(adminService.promoteUser).toHaveBeenCalledWith(requester, id, dto);
    });
  });

  describe('revokeTokens', () => {
    it('should call adminService.revokeRefreshTokens with correct arguments', async () => {
      const dto = { startDate: '2026-06-01T00:00:00Z', endDate: '2026-06-01T23:59:59Z' };
      adminService.revokeRefreshTokens.mockResolvedValue(undefined);

      await controller.revokeTokens(dto);

      expect(adminService.revokeRefreshTokens).toHaveBeenCalledWith(dto);
    });
  });
});
