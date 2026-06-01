/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ClubController } from '../../../src/modules/club/controllers/club.controller';
import { ClubService } from '../../../src/modules/club/club.service';
import { ClubResponseDto } from '../../../src/modules/club/dto/club-governance.dto';
import { ClubStatus } from '../../../src/modules/club/constants/club-status.enum';
import { ActiveClubGuard } from '../../../src/common/guards/active-club.guard';

describe('ClubController', () => {
  let controller: ClubController;
  let service: jest.Mocked<ClubService>;

  beforeEach(async () => {
    const mockClubService = {
      getMyClub: jest.fn(),
      listMyClubMembers: jest.fn(),
      getMyClubMember: jest.fn(),
      leaveClub: jest.fn(),
      succession: jest.fn(),
      removeMember: jest.fn(),
      removeMembers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClubController],
      providers: [{ provide: ClubService, useValue: mockClubService }],
    })
      .overrideGuard(ActiveClubGuard)
      .useValue({ canActivate: jest.fn() })
      .compile();

    controller = module.get<ClubController>(ClubController);
    service = module.get(ClubService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyClub', () => {
    it('should return club details on success', async () => {
      const user = { id: 'user-uuid', club_id: 'club-uuid' } as any;
      const expectedResponse: ClubResponseDto = {
        id: 'club-uuid',
        name: 'Mock FC',
        description: 'Mock Description',
        sofa_score_club_id: '123',
        logo_url: 'logo.png',
        owner_id: 'user-uuid',
        status: ClubStatus.ACTIVE,
        created_at: new Date(),
      };
      service.getMyClub.mockResolvedValue(expectedResponse);

      const result = await controller.getMyClub(user);

      expect(result).toEqual(expectedResponse);
      expect(service.getMyClub).toHaveBeenCalledWith(user);
    });
  });

  describe('leaveClub', () => {
    it('should call service leaveClub on success', async () => {
      const user = { id: 'user-uuid', club_id: 'club-uuid' } as any;
      service.leaveClub.mockResolvedValue(undefined);

      await controller.leaveClub(user);

      expect(service.leaveClub).toHaveBeenCalledWith(user);
    });
  });

  describe('listMyClubMembers', () => {
    it('should call service listMyClubMembers on success', async () => {
      const user = { id: 'user-uuid', club_id: 'club-uuid' } as any;
      const query = { page: 1, limit: 10 };
      const expectedResponse = {
        members: [
          {
            id: 'member-uuid',
            username: 'member',
            first_name: 'Member',
            last_name: null,
            profile_image_url: null,
            member_role: 'STAFF',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      } as any;
      service.listMyClubMembers.mockResolvedValue(expectedResponse);

      const result = await controller.listMyClubMembers(user, query);

      expect(result).toEqual(expectedResponse);
      expect(service.listMyClubMembers).toHaveBeenCalledWith(user, query);
    });
  });

  describe('getMyClubMember', () => {
    it('should call service getMyClubMember on success', async () => {
      const user = { id: 'owner-uuid', club_id: 'club-uuid' } as any;
      const expectedResponse = {
        id: 'member-uuid',
        username: 'member',
        first_name: 'Member',
        last_name: null,
        profile_image_url: null,
        member_role: 'STAFF',
      } as any;
      service.getMyClubMember.mockResolvedValue(expectedResponse);

      const result = await controller.getMyClubMember(user, 'member-uuid');

      expect(result).toEqual(expectedResponse);
      expect(service.getMyClubMember).toHaveBeenCalledWith(user, 'member-uuid');
    });
  });

  describe('succession', () => {
    it('should call service succession on success', async () => {
      const user = { id: 'user-uuid', club_id: 'club-uuid' } as any;
      const dto = { targetUserId: 'target-user-uuid' };
      service.succession.mockResolvedValue(undefined);

      await controller.succession(user, dto);

      expect(service.succession).toHaveBeenCalledWith(user, 'target-user-uuid');
    });
  });

  describe('removeMember', () => {
    it('should call service removeMember on success', async () => {
      const user = { id: 'owner-uuid', club_id: 'club-uuid' } as any;
      service.removeMember.mockResolvedValue(undefined);

      await controller.removeMember(user, 'member-uuid');

      expect(service.removeMember).toHaveBeenCalledWith(user, 'member-uuid');
    });
  });

  describe('removeMembers', () => {
    it('should call service removeMembers on success', async () => {
      const user = { id: 'owner-uuid', club_id: 'club-uuid' } as any;
      const dto = { memberIds: ['member-uuid', 'member-2-uuid'] };
      service.removeMembers.mockResolvedValue(undefined);

      await controller.removeMembers(user, dto);

      expect(service.removeMembers).toHaveBeenCalledWith(user, dto.memberIds);
    });
  });
});
