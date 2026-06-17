/* eslint-disable */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ActiveClubGuard } from '../../../src/common/guards/active-club.guard';
import { ALLOWED_MEMBER_ROLES_KEY } from '../../../src/common/decorators/roles.decorator';
import { TeamRole } from '../../../src/common/enums/team-role.enum';
import { ClubStatus } from '../../../src/modules/club/constants/club-status.enum';

describe('ActiveClubGuard', () => {
  let guard: ActiveClubGuard;
  let reflector: jest.Mocked<Reflector>;
  let userRepository: any;
  let clubRepository: any;

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user: { id: 'user-id' },
      }),
    }),
  } as any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === ALLOWED_MEMBER_ROLES_KEY) return [TeamRole.OWNER];
        return false;
      }),
    } as any;
    userRepository = {
      findActiveById: jest.fn(),
    };
    clubRepository = {
      findActiveById: jest.fn(),
    };

    guard = new ActiveClubGuard(reflector, userRepository, clubRepository);
  });

  it('should allow active club members using database state', async () => {
    userRepository.findActiveById.mockResolvedValue({
      id: 'user-id',
      club_id: 'club-id',
      member_role: TeamRole.OWNER,
    });
    clubRepository.findActiveById.mockResolvedValue({
      id: 'club-id',
      status: ClubStatus.ACTIVE,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(clubRepository.findActiveById).toHaveBeenCalledWith('club-id');
  });

  it('should reject when the database role is not allowed', async () => {
    userRepository.findActiveById.mockResolvedValue({
      id: 'user-id',
      club_id: 'club-id',
      member_role: TeamRole.STAFF,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(clubRepository.findActiveById).not.toHaveBeenCalled();
  });

  it('should reject inactive clubs', async () => {
    userRepository.findActiveById.mockResolvedValue({
      id: 'user-id',
      club_id: 'club-id',
      member_role: TeamRole.OWNER,
    });
    clubRepository.findActiveById.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should reject missing database user', async () => {
    userRepository.findActiveById.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });
});
