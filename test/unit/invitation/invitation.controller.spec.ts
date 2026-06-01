import { Test, TestingModule } from '@nestjs/testing';
import { InvitationController } from '../../../src/modules/invitation/invitation.controller';
import { InvitationService } from '../../../src/modules/invitation/invitation.service';
import { InvitationRespondAction } from '../../../src/modules/invitation/constants/invitation-respond-action.enum';
import type { AccessTokenPayload } from '../../../src/modules/auth/constants/token-payload.type';
import { TeamRole } from '../../../src/common/enums/team-role.enum';
import { SystemRole } from '../../../src/common/enums/system-role.enum';
import {
  AdminInvitationResponseDto,
  ClubSentInvitationResponseDto,
  UserPendingInvitationResponseDto,
} from '../../../src/modules/invitation/dto/invitation-response.dto';

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

describe('InvitationController', () => {
  let controller: InvitationController;
  let createInvitation: jest.MockedFunction<
    InvitationService['createInvitation']
  >;
  let listActivePendingInvites: jest.MockedFunction<
    InvitationService['listActivePendingInvites']
  >;
  let listMyPendingInvites: jest.MockedFunction<
    InvitationService['listMyPendingInvites']
  >;
  let cancelInvite: jest.MockedFunction<InvitationService['cancelInvite']>;
  let respondToInvitation: jest.MockedFunction<
    InvitationService['respondToInvitation']
  >;

  const userPayload = (
    overrides: Partial<AccessTokenPayload> = {},
  ): AccessTokenPayload => ({
    id: 'user-id',
    username: 'test-user',
    status: 'ACTIVE',
    sys_role: SystemRole.USER,
    club_id: null,
    mem_role: TeamRole.NONE,
    ...overrides,
  });

  beforeEach(async () => {
    createInvitation = jest.fn();
    listActivePendingInvites = jest.fn();
    listMyPendingInvites = jest.fn();
    cancelInvite = jest.fn();
    respondToInvitation = jest.fn();

    const mockInvitationService = {
      createInvitation,
      listActivePendingInvites,
      listMyPendingInvites,
      cancelInvite,
      respondToInvitation,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationController],
      providers: [
        { provide: InvitationService, useValue: mockInvitationService },
      ],
    }).compile();

    controller = module.get<InvitationController>(InvitationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createInvitation', () => {
    it('should delegate to service.createInvitation', async () => {
      const user = userPayload({ club_id: 'club-id' });
      const dto = { targetEmail: 'test@example.com' };
      const expectedResponse = new AdminInvitationResponseDto();
      expectedResponse.id = 'invite-id';
      createInvitation.mockResolvedValue(expectedResponse);

      const result = await controller.createInvitation(user, dto);

      expect(result).toEqual(expectedResponse);
      expect(createInvitation).toHaveBeenCalledWith(user, dto);
    });
  });

  describe('listActivePendingInvites', () => {
    it('should delegate to service.listActivePendingInvites', async () => {
      const user = userPayload({ club_id: 'club-id' });
      const invite = new ClubSentInvitationResponseDto();
      invite.id = 'invite-id';
      const expectedResponse = [invite];
      listActivePendingInvites.mockResolvedValue(expectedResponse);

      const result = await controller.listActivePendingInvites(user);

      expect(result).toEqual(expectedResponse);
      expect(listActivePendingInvites).toHaveBeenCalledWith(user);
    });
  });

  describe('listMyPendingInvites', () => {
    it('should delegate to service.listMyPendingInvites', async () => {
      const user = userPayload();
      const invite = new UserPendingInvitationResponseDto();
      invite.id = 'invite-id';
      const expectedResponse = [invite];
      listMyPendingInvites.mockResolvedValue(expectedResponse);

      const result = await controller.listMyPendingInvites(user);

      expect(result).toEqual(expectedResponse);
      expect(listMyPendingInvites).toHaveBeenCalledWith(user);
    });
  });

  describe('cancelInvite', () => {
    it('should delegate to service.cancelInvite', async () => {
      const user = userPayload({ club_id: 'club-id' });
      const inviteId = 'invite-uuid';
      cancelInvite.mockResolvedValue(undefined);

      const result = await controller.cancelInvite(user, inviteId);

      expect(result).toBeUndefined();
      expect(cancelInvite).toHaveBeenCalledWith(user, inviteId);
    });
  });

  describe('respondToInvitation', () => {
    it('should delegate to service.respondToInvitation', async () => {
      const user = userPayload();
      const inviteId = 'invite-uuid';
      const dto = { action: InvitationRespondAction.ACCEPT };
      const expectedResponse = new AdminInvitationResponseDto();
      expectedResponse.id = inviteId;
      respondToInvitation.mockResolvedValue(expectedResponse);

      const result = await controller.respondToInvitation(user, inviteId, dto);

      expect(result).toEqual(expectedResponse);
      expect(respondToInvitation).toHaveBeenCalledWith(user, inviteId, dto);
    });
  });
});
