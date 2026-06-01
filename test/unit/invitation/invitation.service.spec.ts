import { Test, TestingModule } from '@nestjs/testing';
import { InvitationService } from '../../../src/modules/invitation/invitation.service';
import { InvitationRepository } from '../../../src/modules/invitation/repositories/invitation.repository';
import { UserRepository } from '../../../src/modules/user/repositories/user.repository';
import { ClubRepository } from '../../../src/modules/club/repositories/club.repository';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppConfig } from '../../../src/core/config';
import * as crypto from 'crypto';
import { InvitationStatus } from '../../../src/modules/invitation/constants/invitation-status.enum';
import { TeamRole } from '../../../src/common/enums/team-role.enum';
import { InvitationRespondAction } from '../../../src/modules/invitation/constants/invitation-respond-action.enum';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Invitation } from '../../../src/modules/invitation/entities/invitation.entity';
import { User } from '../../../src/modules/user/entities/user.entity';
import { InvitationEvents } from '../../../src/common/events/invitation.events';
import type { AccessTokenPayload } from '../../../src/modules/auth/constants/token-payload.type';
import { SystemRole } from '../../../src/common/enums/system-role.enum';
import { InvitationSearchQueryDto } from '../../../src/modules/invitation/dto/invitation-search-query.dto';

type MockInvitationRepository = {
  internalRepo: {
    findOne: jest.MockedFunction<() => Promise<Invitation | null>>;
    find: jest.MockedFunction<() => Promise<Invitation[]>>;
    create: jest.MockedFunction<(invite: Partial<Invitation>) => Invitation>;
    save: jest.MockedFunction<(invite: Invitation) => Promise<Invitation>>;
  };
  manager: {
    findOne: jest.MockedFunction<() => Promise<Invitation | null>>;
  };
  createQueryBuilder: jest.MockedFunction<(alias: string) => MockQueryBuilder>;
  hasActivePendingInvite: jest.MockedFunction<
    (toUserId: string, clubId: string) => Promise<boolean>
  >;
  hashToken: jest.MockedFunction<(token: string) => string>;
  findActivePendingInvitesByClub: jest.MockedFunction<
    (clubId: string) => Promise<Invitation[]>
  >;
  createPendingInvitation: jest.MockedFunction<
    (data: {
      token: string;
      clubId: string;
      fromUserId: string;
      toUserId: string;
      toEmail: string;
      expiresAt: Date;
      role?: TeamRole;
    }) => Promise<Invitation>
  >;
  findActivePendingInvitesForUser: jest.MockedFunction<
    (userId: string) => Promise<Invitation[]>
  >;
  findForResponseById: jest.MockedFunction<
    (id: string) => Promise<Invitation | null>
  >;
  saveInvitation: jest.MockedFunction<
    (invitation: Invitation) => Promise<Invitation>
  >;
  searchForAdmin: jest.MockedFunction<
    (query: InvitationSearchQueryDto) => Promise<[Invitation[], number]>
  >;
};

type MockUserRepository = {
  findActiveByEmail: jest.MockedFunction<
    (email: string) => Promise<User | null>
  >;
  internalRepo: {
    findOne: jest.MockedFunction<() => Promise<User | null>>;
  };
};

type MockClubRepository = {
  findNotDeletedById: jest.MockedFunction<
    (id: string) => Promise<{ id: string; name: string } | null>
  >;
};

type MockQueryRunner = {
  connect: jest.MockedFunction<() => Promise<void>>;
  startTransaction: jest.MockedFunction<() => Promise<void>>;
  commitTransaction: jest.MockedFunction<() => Promise<void>>;
  rollbackTransaction: jest.MockedFunction<() => Promise<void>>;
  release: jest.MockedFunction<() => Promise<void>>;
  manager: {
    findOne: jest.MockedFunction<() => Promise<User | Invitation | null>>;
    save: jest.MockedFunction<
      (
        entity: typeof Invitation | typeof User,
        value: Invitation | User,
      ) => Promise<Invitation | User | void>
    >;
    update: jest.MockedFunction<
      (
        entity: typeof Invitation,
        criteria: Record<string, unknown>,
        partialEntity: Partial<Invitation>,
      ) => Promise<void>
    >;
  };
};

type MockDataSource = {
  createQueryRunner: jest.MockedFunction<() => MockQueryRunner>;
};

type MockEventEmitter = {
  emit: jest.MockedFunction<
    (event: InvitationEvents, payload: object) => boolean
  >;
};

type MockQueryBuilder = {
  andWhere: jest.MockedFunction<
    (
      condition: string,
      parameters?: Record<string, unknown>,
    ) => MockQueryBuilder
  >;
  leftJoinAndSelect: jest.MockedFunction<
    (property: string, alias: string) => MockQueryBuilder
  >;
  orderBy: jest.MockedFunction<
    (sort: string, order: 'ASC' | 'DESC') => MockQueryBuilder
  >;
  skip: jest.MockedFunction<(skip: number) => MockQueryBuilder>;
  take: jest.MockedFunction<(take: number) => MockQueryBuilder>;
  getManyAndCount: jest.MockedFunction<() => Promise<[Invitation[], number]>>;
};

const accessTokenPayload = (
  overrides: Partial<AccessTokenPayload> = {},
): AccessTokenPayload => ({
  id: 'usr-id',
  username: 'test-user',
  status: 'ACTIVE',
  sys_role: SystemRole.USER,
  club_id: null,
  mem_role: TeamRole.NONE,
  ...overrides,
});

const userEntity = (overrides: Partial<User> = {}): User =>
  ({
    id: 'usr-id',
    email: 'target@example.com',
    username: 'target',
    first_name: 'Target',
    last_name: null,
    member_role: TeamRole.NONE,
    club_id: null,
    profile_image_url: null,
    ...overrides,
  }) as User;

const invitationEntity = (overrides: Partial<Invitation> = {}): Invitation =>
  ({
    id: 'invite-id',
    token: 'hashed-token',
    club_id: 'club-id',
    from_user_id: 'mgr-id',
    to_user_id: 'usr-id',
    to_email: 'target@example.com',
    status: InvitationStatus.PENDING,
    status_changed_at: null,
    note: null,
    role: TeamRole.STAFF,
    expires_at: new Date(Date.now() + 100000),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  }) as Invitation;

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

describe('InvitationService', () => {
  let service: InvitationService;
  let invitationRepository: MockInvitationRepository;
  let userRepository: MockUserRepository;
  let clubRepository: MockClubRepository;
  let dataSource: MockDataSource;
  let eventEmitter: MockEventEmitter;
  let appConfig: Pick<AppConfig, 'baseUrl' | 'apiPrefix'>;
  let mockQueryRunner: MockQueryRunner;

  beforeEach(async () => {
    // Mock Invitation Repository
    invitationRepository = {
      internalRepo: {
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
      manager: {
        findOne: jest.fn(),
      },
      createQueryBuilder: jest.fn(),
      hasActivePendingInvite: jest.fn().mockResolvedValue(false),
      hashToken: jest
        .fn()
        .mockImplementation((t: string) =>
          crypto.createHash('sha256').update(t).digest('hex'),
        ),
      findActivePendingInvitesByClub: jest.fn(),
      createPendingInvitation: jest.fn(),
      findActivePendingInvitesForUser: jest.fn(),
      findForResponseById: jest.fn(),
      saveInvitation: jest.fn(),
      searchForAdmin: jest.fn(),
    };

    // Mock User Repository
    userRepository = {
      findActiveByEmail: jest.fn(),
      internalRepo: {
        findOne: jest.fn(),
      },
    };

    // Mock Club Repository
    clubRepository = {
      findNotDeletedById: jest.fn(),
    };

    // Mock QueryRunner for ACID transaction testing
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
      },
    };

    // Mock DataSource
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    // Mock EventEmitter2
    eventEmitter = {
      emit: jest.fn(),
    };

    // Mock AppConfig
    appConfig = {
      baseUrl: 'http://localhost:3000',
      apiPrefix: 'api/v1',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        { provide: InvitationRepository, useValue: invitationRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: ClubRepository, useValue: clubRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: AppConfig, useValue: appConfig },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvitation', () => {
    const managerPayload = accessTokenPayload({
      id: 'mgr-id',
      club_id: 'club-id',
    });
    const createDto = { targetEmail: 'target@example.com' };

    it('should throw BadRequestException if manager does not belong to a club', async () => {
      await expect(
        service.createInvitation(
          accessTokenPayload({ id: 'mgr-id' }),
          createDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      userRepository.findActiveByEmail.mockResolvedValue(null);

      await expect(
        service.createInvitation(managerPayload, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if target user already belongs to a club', async () => {
      const mockUser = userEntity({
        member_role: TeamRole.OWNER,
      });
      userRepository.findActiveByEmail.mockResolvedValue(mockUser);

      await expect(
        service.createInvitation(managerPayload, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if target user already has an active pending invitation from the club', async () => {
      const mockUser = userEntity();
      userRepository.findActiveByEmail.mockResolvedValue(mockUser);
      invitationRepository.hasActivePendingInvite.mockResolvedValue(true);

      await expect(
        service.createInvitation(managerPayload, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully create an invitation, emit USER_INVITED event, and return response DTO', async () => {
      const mockUser = userEntity();
      const mockClub = { id: 'club-id', name: 'Super Club FC' };
      const mockInvitation = invitationEntity({
        id: 'invite-uuid',
      });

      userRepository.findActiveByEmail.mockResolvedValue(mockUser);
      invitationRepository.hasActivePendingInvite.mockResolvedValue(false);
      clubRepository.findNotDeletedById.mockResolvedValue(mockClub);
      invitationRepository.createPendingInvitation.mockResolvedValue(
        mockInvitation,
      );

      const result = await service.createInvitation(managerPayload, createDto);

      const [createArg] =
        invitationRepository.createPendingInvitation.mock.calls[0];
      expect(createArg.token).toMatch(/^[a-f0-9]{64}$/);
      expect(createArg).toEqual(
        expect.objectContaining({
          clubId: 'club-id',
          fromUserId: 'mgr-id',
          toUserId: 'usr-id',
          toEmail: 'target@example.com',
          role: TeamRole.STAFF,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        InvitationEvents.USER_INVITED,
        expect.objectContaining({
          email: 'target@example.com',
          clubName: 'Super Club FC',
          clubId: 'club-id',
        }),
      );
      expect(result.id).toBe('invite-uuid');
      expect(result.to_email).toBe('target@example.com');
    });
  });

  describe('listActivePendingInvites', () => {
    const managerPayload = accessTokenPayload({
      id: 'mgr-id',
      club_id: 'club-id',
    });

    it('should throw BadRequestException if manager does not belong to a club', async () => {
      await expect(
        service.listActivePendingInvites(accessTokenPayload({ id: 'mgr-id' })),
      ).rejects.toThrow(BadRequestException);
    });

    it("should return the club's active pending invitations", async () => {
      const mockInvites = [
        invitationEntity({
          id: 'invite-1',
          to_user: userEntity({
            id: 'usr-1',
            first_name: 'John',
            last_name: 'Doe',
          }),
        }),
      ];

      invitationRepository.findActivePendingInvitesByClub.mockResolvedValue(
        mockInvites,
      );

      const result = await service.listActivePendingInvites(managerPayload);

      expect(
        invitationRepository.findActivePendingInvitesByClub,
      ).toHaveBeenCalledWith('club-id');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('invite-1');
    });
  });

  describe('cancelInvite', () => {
    const managerPayload = accessTokenPayload({
      id: 'mgr-id',
      club_id: 'club-id',
    });

    it('should throw BadRequestException if manager does not belong to a club', async () => {
      await expect(
        service.cancelInvite(accessTokenPayload({ id: 'mgr-id' }), 'invite-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if invitation is not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.cancelInvite(managerPayload, 'invite-id'),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if invitation belongs to another club', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(
        invitationEntity({
          id: 'invite-id',
          club_id: 'other-club-id',
        }),
      );

      await expect(
        service.cancelInvite(managerPayload, 'invite-id'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ConflictException if invitation is not PENDING', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(
        invitationEntity({
          id: 'invite-id',
          club_id: 'club-id',
          status: InvitationStatus.ACCEPTED,
        }),
      );

      await expect(
        service.cancelInvite(managerPayload, 'invite-id'),
      ).rejects.toThrow(ConflictException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should successfully revoke invitation and save', async () => {
      const mockInvite = invitationEntity({
        id: 'invite-id',
      });

      mockQueryRunner.manager.findOne.mockResolvedValue(mockInvite);

      await service.cancelInvite(managerPayload, 'invite-id');

      expect(mockInvite.status).toBe(InvitationStatus.REVOKED);
      expect(mockInvite.status_changed_at).toBeInstanceOf(Date);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        Invitation,
        mockInvite,
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('listMyPendingInvites', () => {
    const userPayload = accessTokenPayload({ id: 'usr-id' });

    it('should return pending invitations for current user', async () => {
      const mockInvites = [
        invitationEntity({
          id: 'invite-1',
          club: {
            id: 'club-1',
            name: 'Club One',
            logo_url: null,
          } as Invitation['club'],
          from_user: userEntity({ id: 'mgr-1', first_name: 'Mgr' }),
        }),
      ];

      invitationRepository.internalRepo.find.mockResolvedValue(mockInvites);
      invitationRepository.findActivePendingInvitesForUser.mockResolvedValue(
        mockInvites,
      );

      const result = await service.listMyPendingInvites(userPayload);

      expect(
        invitationRepository.findActivePendingInvitesForUser,
      ).toHaveBeenCalledWith('usr-id');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('invite-1');
    });
  });

  describe('respondToInvitation', () => {
    const userPayload = accessTokenPayload({ id: 'usr-id' });
    const inviteId = 'invite-id';

    it('should throw NotFoundException if invitation is not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.respondToInvitation(userPayload, inviteId, {
          action: InvitationRespondAction.ACCEPT,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if invitation is not for this user', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(
        invitationEntity({
          id: inviteId,
          to_user_id: 'other-user-id',
        }),
      );

      await expect(
        service.respondToInvitation(userPayload, inviteId, {
          action: InvitationRespondAction.ACCEPT,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ConflictException if invitation status is not PENDING', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(
        invitationEntity({
          id: inviteId,
          status: InvitationStatus.ACCEPTED,
        }),
      );

      await expect(
        service.respondToInvitation(userPayload, inviteId, {
          action: InvitationRespondAction.ACCEPT,
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should mark as EXPIRED and throw ConflictException if invite is expired', async () => {
      const mockInvite = invitationEntity({
        id: inviteId,
        expires_at: new Date(Date.now() - 10000), // in the past
      });

      mockQueryRunner.manager.findOne.mockResolvedValue(mockInvite);

      await expect(
        service.respondToInvitation(userPayload, inviteId, {
          action: InvitationRespondAction.ACCEPT,
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockInvite.status).toBe(InvitationStatus.EXPIRED);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        Invitation,
        mockInvite,
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should update status to REJECTED if respond action is REJECT', async () => {
      const mockInvite = invitationEntity({
        id: inviteId,
      });

      mockQueryRunner.manager.findOne.mockResolvedValue(mockInvite);
      mockQueryRunner.manager.save.mockImplementation((_, invite) =>
        Promise.resolve(invite as Invitation),
      );

      const result = await service.respondToInvitation(userPayload, inviteId, {
        action: InvitationRespondAction.REJECT,
      });

      expect(mockInvite.status).toBe(InvitationStatus.REJECTED);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        Invitation,
        mockInvite,
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.id).toBe(inviteId);
    });

    describe('Accept Action (ACID Transaction)', () => {
      let mockInvite: Invitation;

      beforeEach(() => {
        mockInvite = invitationEntity({
          id: inviteId,
        });
      });

      it('should throw NotFoundException if user is not found in database', async () => {
        mockQueryRunner.manager.findOne
          .mockResolvedValueOnce(mockInvite)
          .mockResolvedValueOnce(null); // second find is for user

        await expect(
          service.respondToInvitation(userPayload, inviteId, {
            action: InvitationRespondAction.ACCEPT,
          }),
        ).rejects.toThrow(NotFoundException);

        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });

      it('should throw ConflictException if user already belongs to a club', async () => {
        const mockUser = userEntity({
          member_role: TeamRole.STAFF,
          club_id: 'club-id',
        });
        mockQueryRunner.manager.findOne
          .mockResolvedValueOnce(mockInvite)
          .mockResolvedValueOnce(mockUser);

        await expect(
          service.respondToInvitation(userPayload, inviteId, {
            action: InvitationRespondAction.ACCEPT,
          }),
        ).rejects.toThrow(ConflictException);

        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });

      it('should throw ConflictException if invitation status is no longer PENDING', async () => {
        mockQueryRunner.manager.findOne.mockResolvedValue(
          invitationEntity({
            id: inviteId,
            status: InvitationStatus.REVOKED,
          }),
        );

        await expect(
          service.respondToInvitation(userPayload, inviteId, {
            action: InvitationRespondAction.ACCEPT,
          }),
        ).rejects.toThrow(ConflictException);

        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
      });

      it('should successfully accept, update user details, expire other invites, and commit', async () => {
        const mockUser = userEntity();
        const dbInvite = invitationEntity({ ...mockInvite });

        mockQueryRunner.manager.findOne
          .mockResolvedValueOnce(dbInvite) // invitation lock
          .mockResolvedValueOnce(mockUser); // user lock

        const result = await service.respondToInvitation(
          userPayload,
          inviteId,
          { action: InvitationRespondAction.ACCEPT },
        );

        expect(mockQueryRunner.connect).toHaveBeenCalled();
        expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
        expect(dbInvite.status).toBe(InvitationStatus.ACCEPTED);
        expect(mockUser.member_role).toBe(TeamRole.STAFF);
        expect(mockUser.club_id).toBe('club-id');

        expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
          Invitation,
          dbInvite,
        );
        expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
          User,
          mockUser,
        );
        const [updateEntity, updateCriteria, updatePayload] =
          mockQueryRunner.manager.update.mock.calls[0];
        expect(updateEntity).toBe(Invitation);
        expect(updateCriteria).toEqual({
          to_user_id: 'usr-id',
          status: InvitationStatus.PENDING,
        });
        expect(updatePayload.status).toBe(InvitationStatus.EXPIRED);
        expect(updatePayload.status_changed_at).toBeInstanceOf(Date);
        expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        expect(mockQueryRunner.release).toHaveBeenCalled();
        expect(result.id).toBe(inviteId);
      });
    });
  });

  describe('listAllInvitesForAdmin', () => {
    it('should delegate admin search to repository and return paginated result', async () => {
      const query: InvitationSearchQueryDto = {
        status: InvitationStatus.PENDING,
        club_id: 'club-id',
        to_email: 'test@example.com',
        page: 2,
        limit: 5,
      };

      invitationRepository.searchForAdmin.mockResolvedValue([[], 0]);

      const result = await service.listAllInvitesForAdmin(query);

      expect(invitationRepository.searchForAdmin).toHaveBeenCalledWith(query);
      expect(result.total).toBe(0);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.invitations).toHaveLength(0);
    });
  });
});
