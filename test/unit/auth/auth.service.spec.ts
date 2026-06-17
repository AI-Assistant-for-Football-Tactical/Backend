/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UserRepository } from '../../../src/modules/user/repositories/user.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthToken } from '../../../src/modules/auth/entities/token.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppConfig } from '../../../src/core/config';
import { PinoLogger } from 'nestjs-pino';
import { AuthTokenService } from '../../../src/modules/auth/auth-token.service';
import { UserService } from '../../../src/modules/user/user.service';
import { AccountStatus } from '../../../src/common/enums/account-status.enum';
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthTokenType } from '../../../src/modules/auth/constants/auth-token-type.enum';
import { SystemRole } from '../../../src/common/enums/system-role.enum';
import { DataSource, type Repository, type QueryRunner } from 'typeorm';
import * as passwordHash from '../../../src/utils/hash/password.hash';
import { User } from '../../../src/modules/user/entities/user.entity';

// Mock password hash utils
jest.mock('../../../src/utils/hash/password.hash', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  comparePassword: jest.fn().mockResolvedValue(true),
}));

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

describe('AuthService', () => {
  let authService: AuthService;
  let tokenRepo: jest.Mocked<Repository<AuthToken>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let tokenService: jest.Mocked<AuthTokenService>;
  let mockInternalRepo: jest.Mocked<Repository<User>>;
  let mockQueryRunner: jest.Mocked<QueryRunner>;
  let userRepository: any;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    mockInternalRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      }),
    } as unknown as jest.Mocked<Repository<User>>;

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<QueryRunner>;

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      manager: {
        delete: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockUserRepository = {
      internalRepo: mockInternalRepo,
      findActiveByEmail: jest.fn(),
      findNotDeletedById: jest.fn(),
      findActiveById: jest.fn(),
      findNotDeletedNotBannedById: jest.fn(),
      findNotDeletedNotBannedByEmail: jest.fn(),
    };

    const mockTokenRepo = {
      findOne: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockAppConfig = {
      baseUrl: 'http://localhost',
      apiPrefix: 'api/v1',
    };

    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const mockTokenService = {
      createAccessTokenOrThrow: jest.fn().mockReturnValue('access_token_mock'),
      createRefreshToken: jest.fn().mockResolvedValue('refresh_token_mock'),
      hashToken: jest.fn().mockReturnValue('hashed_token'),
      generateRandomToken: jest.fn().mockReturnValue('random_token'),
      createTokenRecord: jest.fn().mockResolvedValue(undefined),
    };

    const mockUserService = {
      findOneById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: getRepositoryToken(AuthToken), useValue: mockTokenRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AppConfig, useValue: mockAppConfig },
        { provide: PinoLogger, useValue: mockLogger },
        { provide: AuthTokenService, useValue: mockTokenService },
        { provide: UserService, useValue: mockUserService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    tokenRepo = module.get(getRepositoryToken(AuthToken));
    eventEmitter = module.get(EventEmitter2);
    tokenService = module.get(AuthTokenService);
    userService = module.get(UserService);
    userRepository = mockUserRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    const signUpDto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
    };

    it('should throw ConflictException if ACTIVE user with same email exists', async () => {
      mockInternalRepo.findOne.mockImplementation(() =>
        Promise.resolve({
          id: '123',
          email: 'test@example.com',
          status: AccountStatus.ACTIVE,
          deleted_at: null,
        } as User),
      );

      await expect(authService.signUp(signUpDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create a new user successfully if no existing user found', async () => {
      const newUser = {
        id: 'new-uuid-5678',
        email: 'test@example.com',
        username: 'testuser',
        status: AccountStatus.PENDING_VERIFICATION,
        system_role: SystemRole.USER,
      } as User;

      mockInternalRepo.findOne.mockResolvedValue(null);
      mockInternalRepo.create.mockReturnValue(newUser);
      mockInternalRepo.save.mockResolvedValue(newUser);

      const result = await authService.signUp(signUpDto);

      expect(mockInternalRepo.create as jest.Mock).toHaveBeenCalled();
      expect(mockInternalRepo.save as jest.Mock).toHaveBeenCalledWith(newUser);
      expect(result.accessToken).toBe('access_token_mock');
    });
  });

  describe('validateUser', () => {
    it('should return user data if credentials are correct', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        status: AccountStatus.ACTIVE,
      } as User;

      (
        mockInternalRepo.createQueryBuilder().getOne as jest.Mock
      ).mockResolvedValue(mockUser);
      (passwordHash.comparePassword as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
      // @ts-expect-error
      expect(result?.password_hash).toBeUndefined();
    });

    it('should return null if user not found', async () => {
      (
        mockInternalRepo.createQueryBuilder().getOne as jest.Mock
      ).mockResolvedValue(null);
      (passwordHash.comparePassword as jest.Mock).mockResolvedValue(false);

      const result = await authService.validateUser(
        'notfound@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });

    it('should return null if password incorrect', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
      } as User;
      (
        mockInternalRepo.createQueryBuilder().getOne as jest.Mock
      ).mockResolvedValue(mockUser);
      (passwordHash.comparePassword as jest.Mock).mockResolvedValue(false);

      const result = await authService.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('verifyUserEmail', () => {
    it('should verify user and update status to ACTIVE within transaction', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        is_verified: false,
        status: AccountStatus.PENDING_VERIFICATION,
      } as User;

      (mockQueryRunner.manager.findOne as jest.Mock).mockResolvedValue(
        mockUser,
      );
      tokenRepo.findOne.mockResolvedValue({
        id: 'tok123',
        token_hash: 'hashed',
      } as AuthToken);
      (mockQueryRunner.manager.save as jest.Mock).mockResolvedValue({
        ...mockUser,
        is_verified: true,
        status: AccountStatus.ACTIVE,
      });

      const result = await authService.verifyUserEmail('123', 'token123');

      expect(result.is_verified).toBe(true);
      expect(result.status).toBe(AccountStatus.ACTIVE);
      expect(mockQueryRunner.commitTransaction as jest.Mock).toHaveBeenCalled();
      expect(mockQueryRunner.release as jest.Mock).toHaveBeenCalled();
    });

    it('should rollback transaction on failure', async () => {
      (mockQueryRunner.manager.findOne as jest.Mock).mockRejectedValue(
        new Error('DB Error'),
      );

      await expect(
        authService.verifyUserEmail('123', 'token123'),
      ).rejects.toThrow('DB Error');
      expect(
        mockQueryRunner.rollbackTransaction as jest.Mock,
      ).toHaveBeenCalled();
      expect(mockQueryRunner.release as jest.Mock).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user is already verified', async () => {
      (mockQueryRunner.manager.findOne as jest.Mock).mockResolvedValue({
        id: '123',
        is_verified: true,
      } as User);

      await expect(
        authService.verifyUserEmail('123', 'token123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestEmailVerification', () => {
    it('should request verification and delete old tokens within transaction', async () => {
      const mockUser = {
        id: '123',
        is_verified: false,
        status: AccountStatus.PENDING_VERIFICATION,
      } as User;
      userRepository.findNotDeletedNotBannedById.mockResolvedValue(mockUser);

      await authService.requestEmailVerification('123');

      (mockQueryRunner.manager.delete as jest.Mock).mockResolvedValue(
        undefined,
      );
      expect((mockQueryRunner.manager as any).delete).toHaveBeenCalledWith(
        AuthToken,
        expect.any(Object),
      );
      expect((mockQueryRunner as any).commitTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user is verified', async () => {
      userRepository.findNotDeletedNotBannedById.mockResolvedValue({
        id: '123',
        is_verified: true,
      } as User);

      await expect(authService.requestEmailVerification('123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if token not found or expired', async () => {
      tokenRepo.findOne.mockResolvedValue(null as unknown as AuthToken);

      await expect(authService.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      tokenRepo.findOne.mockResolvedValue({
        user_id: '123',
        expires_at: new Date(Date.now() + 10000),
      } as AuthToken);
      userService.findOneById.mockResolvedValue(null);

      await expect(authService.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user BANNED', async () => {
      tokenRepo.findOne.mockResolvedValue({
        user_id: '123',
        expires_at: new Date(Date.now() + 10000),
      } as AuthToken);
      userService.findOneById.mockResolvedValue({
        id: '123',
        status: AccountStatus.BANNED,
      } as User);

      await expect(authService.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if security action after token creation', async () => {
      tokenRepo.findOne.mockResolvedValue({
        user_id: '123',
        created_at: new Date(Date.now() - 5000),
        expires_at: new Date(Date.now() + 5000),
      } as AuthToken);
      userService.findOneById.mockResolvedValue({
        id: '123',
        status: AccountStatus.ACTIVE,
        last_security_action_at: new Date(Date.now()),
      } as User);

      await expect(authService.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should rotate tokens successfully within transaction', async () => {
      const mockUser = {
        id: '123',
        status: AccountStatus.ACTIVE,
        last_security_action_at: new Date(Date.now() - 10000),
      } as User;
      tokenRepo.findOne.mockResolvedValue({
        user_id: '123',
        created_at: new Date(Date.now() - 5000),
        expires_at: new Date(Date.now() + 5000),
      } as AuthToken);
      userService.findOneById.mockResolvedValue(mockUser);

      const result = await authService.refresh('token');

      expect(
        (mockQueryRunner.manager.remove as jest.Mock).mock.calls.length,
      ).toBeGreaterThan(0);
      expect(tokenService.createRefreshToken as jest.Mock).toHaveBeenCalled();
      expect(result.accessToken).toBe('access_token_mock');
      expect(mockQueryRunner.commitTransaction as jest.Mock).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password, revoke all sessions, and rotate token within transaction', async () => {
      const mockUser = {
        id: '123',
        status: AccountStatus.ACTIVE,
        email: 'test@example.com',
      } as User;
      tokenRepo.findOne.mockResolvedValue({
        user_id: '123',
        expires_at: new Date(Date.now() + 10000),
      } as AuthToken);
      (mockQueryRunner.manager.findOne as jest.Mock).mockResolvedValue(
        mockUser,
      );

      const result = await authService.resetPassword('newpass', 'token');

      expect(mockQueryRunner.manager.delete as jest.Mock).toHaveBeenCalledWith(
        AuthToken,
        {
          user_id: '123',
          type: AuthTokenType.REFRESH,
        },
      );
      expect(
        (mockQueryRunner.manager.save as jest.Mock).mock.calls.length,
      ).toBeGreaterThan(0);
      expect(result.accessToken).toBe('access_token_mock');
      expect(mockQueryRunner.commitTransaction as jest.Mock).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user BANNED', async () => {
      tokenRepo.findOne.mockResolvedValue({
        user_id: '123',
        expires_at: new Date(Date.now() + 10000),
      } as AuthToken);
      (mockQueryRunner.manager.findOne as jest.Mock).mockResolvedValue({
        id: '123',
        status: AccountStatus.BANNED,
      } as User);

      await expect(
        authService.resetPassword('newpass', 'token'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    it('should request password change if current password correct', async () => {
      const mockUser = {
        id: '123',
        password_hash: 'hashed',
        email: 'test@example.com',
      } as User;
      userRepository.findNotDeletedNotBannedById.mockResolvedValue(mockUser);
      (passwordHash.comparePassword as jest.Mock).mockResolvedValue(true);

      const result = await authService.changePassword('123', 'correct');

      expect(eventEmitter.emit as jest.Mock).toHaveBeenCalledWith(
        'auth.password-changed',
        expect.any(Object),
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if current password wrong', async () => {
      userRepository.findNotDeletedNotBannedById.mockResolvedValue({
        id: '123',
        password_hash: 'hashed',
      } as User);
      (passwordHash.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(authService.changePassword('123', 'wrong')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke all refresh tokens and update security action timestamp', async () => {
      const userId = '123';
      (mockQueryRunner.manager.delete as jest.Mock).mockResolvedValue({
        affected: 1,
      });
      (mockQueryRunner.manager.update as jest.Mock).mockResolvedValue({
        affected: 1,
      });

      await authService.logout(userId);

      expect((mockQueryRunner.manager as any).delete).toHaveBeenCalledWith(
        AuthToken,
        {
          user_id: userId,
          type: AuthTokenType.REFRESH,
        },
      );
      expect((mockQueryRunner.manager as any).update).toHaveBeenCalledWith(
        User,
        userId,
        expect.any(Object),
      );
      expect((mockQueryRunner as any).commitTransaction).toHaveBeenCalled();
      expect((mockQueryRunner as any).release).toHaveBeenCalled();
    });
  });
});
