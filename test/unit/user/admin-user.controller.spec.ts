/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminUserController } from '../../../src/modules/user/admin-user.controller';
import { UserService } from '../../../src/modules/user/user.service';
import { UpdateUserStatusByAdminDto } from '../../../src/modules/user/dto/update-user-status.dto';
import { UserSearchQueryDto } from '../../../src/modules/user/dto/user-search.dto';
import { AccountStatus } from '../../../src/common/enums/account-status.enum';
import type { AccessTokenPayload } from '../../../src/modules/auth/constants/token-payload.type';

describe('AdminUserController', () => {
  let controller: AdminUserController;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const mockUserService = {
      updateUserStatusByAdmin: jest.fn(),
      searchUsers: jest.fn(),
      revokeSessionsByAdmin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<AdminUserController>(AdminUserController);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateUserStatus', () => {
    it('should call userService.updateUserStatusByAdmin with correct arguments', async () => {
      const id = 'test-uuid';
      const requester = { id: 'admin-uuid' } as AccessTokenPayload;
      const dto: UpdateUserStatusByAdminDto = { status: AccountStatus.BANNED };

      await controller.updateUserStatusByAdmin(requester, id, dto);

      expect(userService.updateUserStatusByAdmin).toHaveBeenCalledWith(requester, id, dto);
    });
  });

  describe('searchUsers', () => {
    it('should call userService.searchUsers with correct arguments', async () => {
      const query: UserSearchQueryDto = { page: 1, limit: 10 };
      userService.searchUsers.mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const result = await controller.searchUsers(query);

      expect(userService.searchUsers).toHaveBeenCalledWith(query);
      expect(result).toEqual({ users: [], total: 0, page: 1, limit: 10 });
    });
  });

  describe('revokeSessions', () => {
    it('should call userService.revokeSessionsByAdmin with correct arguments', async () => {
      const id = 'test-uuid';
      const requester = { id: 'admin-uuid' } as AccessTokenPayload;
      userService.revokeSessionsByAdmin.mockResolvedValue(undefined);

      await controller.revokeSessions(id, requester);

      expect(userService.revokeSessionsByAdmin).toHaveBeenCalledWith(requester, id);
    });
  });
});
