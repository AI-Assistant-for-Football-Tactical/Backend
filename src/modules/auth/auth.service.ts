import { In, MoreThan, Not, Repository, DataSource } from 'typeorm';
import { AppConfig } from '../../core/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AuthToken } from './entities/token.entity';
import { User } from '../user/entities/user.entity';
import { SignUpReqDto } from './dtos/sign-up.dto';
import { AuthTokenType } from './constants/auth-token-type.enum';
import { AuthEventsPayload } from './constants/auth-events-payload';
import { PinoLogger } from 'nestjs-pino';
import { AuthTokenService } from './auth-token.service';
import { UserService } from '../user/user.service';
import { AccountStatus } from '../../common/enums/account-status.enum';
import { UserRepository } from '../user/repositories/user.repository';
import { hashPassword, comparePassword } from '../../utils/hash/password.hash';
import { SecurityEvents } from '../../common/events/security.events';
import { updateSecurityActionTime } from './helpers/security.helper';
import type { CreateTokenDto } from './dtos/create-token.dto';
import type { AuthTokens } from './constants/auth-tokens.type';
import type { AccessTokenPayload } from './constants/token-payload.type';
import { TeamRole } from '../../common/enums/team-role.enum';

type verificationTokens = {
  url: string;
  token: string;
};

@Injectable()
export class AuthService {
  /**
   * Constructs an instance of the AuthService.
   *
   * @param {Repository<User>} userRepo - The TypeORM repository for User entities.
   * @param {Repository<Token>} tokenRepo - The TypeORM repository for Token entities.
   * @param {EventEmitter2} eventEmitter - The event emitter for firing events.
   * @param {AppConfig} appConfig - The config service for accessing environment variables.
   * @param {PinoLogger} logger - The logger for logging events.
   * @param {TokenService} tokenService - The service for creating and managing tokens.
   * @param {UserService} userService - The service for managing user entities.
   */
  constructor(
    private readonly userRepository: UserRepository,
    @InjectRepository(AuthToken)
    private tokenRepo: Repository<AuthToken>,
    private readonly eventEmitter: EventEmitter2,
    private readonly appConfig: AppConfig,
    private readonly logger: PinoLogger,
    private readonly tokenService: AuthTokenService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Handles user registration, including data validation, user creation,
   * and initiating the email verification process.
   *
   * @param {SignUpReqDto} SignUpReqDto - The data transfer object containing user registration details.
   * @throws {ConflictException} If a user with the same email or username already exists.
   * @returns {Promise<void>} A promise that resolves when the sign-up process is complete.
   */
  async signUp(
    signUpDto: SignUpReqDto,
  ): Promise<AuthTokens & verificationTokens> {
    this.logger.info('Attempting Sign Up:', {
      email: signUpDto.email,
      username: signUpDto.username,
    });

    const { password, ...userData } = signUpDto;

    // Check if user with the same email or username already exists
    const existingUser = await this.userRepository.internalRepo.findOne({
      where: [{ email: userData.email }, { username: userData.username }],
    });

    if (existingUser) {
      if (existingUser.email === signUpDto.email) {
        this.logger.error('Email already registered.');
        throw new ConflictException('Email already registered.');
      } else {
        this.logger.error('Username is already taken.');
        throw new ConflictException('Username is already taken.');
      }
    }

    // Create and Save fresh user to DB (works for both new emails and previously soft-deleted ones)
    const newUser = this.userRepository.internalRepo.create({
      ...userData,
      password_hash: await hashPassword(password),
      last_security_action_at: updateSecurityActionTime(),
    });

    await this.userRepository.internalRepo.save(newUser);

    // generate email verification token and send it
    const { token, url } =
      await this.createEmailVerificationTokenAndUrl(newUser);

    // generate access and refresh tokens
    const accessToken = this.tokenService.createAccessTokenOrThrow(
      this.buildAccessPayload(newUser),
    );
    const refreshToken = await this.tokenService.createRefreshToken(newUser.id);

    return {
      accessToken,
      refreshToken,
      url: url,
      token: token,
    };
  }

  /**
   * generates access and refresh tokens upon successful authentication.
   *
   * @param user - User's Data like (id, username)
   * @returns An object containing JWT access and random refresh tokens
   */
  async login(user: User): Promise<AuthTokens> {
    // Generate access and refresh tokens
    const payload = this.buildAccessPayload(user);

    const accessToken: string =
      this.tokenService.createAccessTokenOrThrow(payload);
    const refreshToken: string = await this.tokenService.createRefreshToken(
      user.id,
    );

    this.logger.info('LogIn:', payload);

    return { accessToken, refreshToken };
  }

  /**
   * Validates a user's credentials (username or email and password)
   *
   * @param {string} identifier - The username or email of the user.
   * @param {string} password - The plain-text password to verify.
   * @returns {Promise<Omit<User, 'password_hash'> | null>}
   * Returns the user object without the password hash if valid, otherwise null.
   */
  async validateUser(
    identifier: string,
    password: string,
  ): Promise<Omit<User, 'password_hash'> | null> {
    const isEmail = identifier.includes('@');

    const qb = this.userRepository.internalRepo
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.status NOT IN (:...statuses)', {
        statuses: [AccountStatus.BANNED, AccountStatus.SOFT_DELETED],
      });

    // Build the Identity Check
    if (isEmail) {
      qb.andWhere('user.email = :identifier', { identifier });
    } else {
      qb.andWhere('user.username = :identifier', { identifier });
    }

    const user = await qb.getOne();

    const isPasswordCorrect = await comparePassword(
      password,
      user?.password_hash ?? 'DUMMY_HASH',
    );

    if (!user || !isPasswordCorrect) return null;

    const userData = {
      ...user,
      password_hash: undefined,
    };

    return userData;
  }

  /**
   * Verifies a user's email address using a verification token.
   *
   * @param id - The user's ID.
   * @param token - The verification token.
   * @returns {Promise<User>} The verified user.
   * @throws {BadRequestException} If the user is not found, token is invalid, or expired.
   */
  async verifyUserEmail(id: string, token: string): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: {
          id,
          status: Not(In([AccountStatus.BANNED, AccountStatus.SOFT_DELETED])),
        },
      });

      if (!user) throw new BadRequestException('User not found');
      if (user.is_verified)
        throw new BadRequestException('User is already verified');

      const tokenHash = this.tokenService.hashToken(token);

      const verifyToken: AuthToken | null = await this.tokenRepo.findOne({
        where: {
          token_hash: tokenHash,
          user_id: user.id,
          type: AuthTokenType.EMAIL_VERIFY,
          expires_at: MoreThan(new Date()),
        },
      });

      if (!verifyToken) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      await queryRunner.manager.remove(AuthToken, verifyToken);

      user.is_verified = true;
      user.status = AccountStatus.ACTIVE;
      user.last_security_action_at = updateSecurityActionTime();
      await queryRunner.manager.save(User, user);

      await queryRunner.commitTransaction();

      this.eventEmitter.emit(SecurityEvents.EMAIL_VERIFIED, {
        user_id: user.id,
        action: 'email-verified',
      });

      return user;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Requests a new email verification token.
   *
   * @param id - The user's ID.
   * @throws {BadRequestException} If the user is invalid or already verified.
   */
  async requestEmailVerification(id: string): Promise<verificationTokens> {
    const user = await this.userRepository.findNotDeletedNotBannedById(id);

    if (!user) throw new BadRequestException('Invalid user id.');
    if (user.status === AccountStatus.BANNED)
      throw new BadRequestException('User is banned.');
    if (user.is_verified)
      throw new BadRequestException('User is already verified.');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // delete existing email verification token if exists
      await queryRunner.manager.delete(AuthToken, {
        user_id: user.id,
        type: AuthTokenType.EMAIL_VERIFY,
      });

      const result = await this.createEmailVerificationTokenAndUrl(
        user,
        queryRunner.manager,
      );
      await queryRunner.commitTransaction();

      this.emitVerificationEmail(user, result.url);
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Handles the refresh of an access token, given a valid refresh token.
   * Validates the refresh token, the user associated with the token, and
   * generates new access and refresh tokens.
   *
   * @param refreshToken - The refresh token to validate.
   * @returns A promise that resolves with an object containing the new
   * access and refresh tokens.
   * @throws {UnauthorizedException} If the refresh token is invalid.
   * @throws {BadRequestException} If the user associated with the token is not found.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    // Validate the refresh token
    const refreshTokenHash = this.tokenService.hashToken(refreshToken);

    const token: AuthToken | null = await this.tokenRepo.findOne({
      where: {
        token_hash: refreshTokenHash,
        type: AuthTokenType.REFRESH,
        expires_at: MoreThan(new Date()),
      },
    });

    if (!token) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // validate user
    const user = await this.userService.findOneById(token.user_id);

    if (!user) {
      this.logger.error('Refresh attempted for non-existent user', {
        user_id: token.user_id,
      });
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    if (user.status === AccountStatus.BANNED) {
      this.logger.warn('Banned user attempted token refresh', {
        user_id: user.id,
      });
      throw new UnauthorizedException('Account suspended.');
    }

    if (user.last_security_action_at > token.created_at) {
      this.logger.warn(
        'Refresh token invalidated by a subsequent security action',
        {
          user_id: user.id,
        },
      );

      throw new UnauthorizedException(
        'Session invalidated. Please log in again.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // rotate refresh token
      await queryRunner.manager.remove(AuthToken, token);

      const rawNewRefreshToken = await this.tokenService.createRefreshToken(
        user.id,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      const newAccessToken = this.tokenService.createAccessTokenOrThrow(
        this.buildAccessPayload(user),
      );

      return { accessToken: newAccessToken, refreshToken: rawNewRefreshToken };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Initiates the password change process by verifying the current password
   * and sending a reset password link to the user's email.
   *
   * @param userId - The user's ID.
   * @param currentPassword - The current password for verification.
   * @throws {BadRequestException} If the user is not found or password is invalid.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
  ): Promise<verificationTokens | void> {
    const user: User | null =
      await this.userRepository.findNotDeletedNotBannedById(userId, undefined, {
        password_hash: true,
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        username: true,
      });

    const isPassCorrect = await comparePassword(
      currentPassword,
      user?.password_hash || 'DUMMY_HASH',
    );

    if (!user || !isPassCorrect) {
      throw new BadRequestException('Invalid credentials.');
    }

    // create password reset token
    const { token: resetPasswordToken, url: resetPasswordUrl } =
      await this.createResetPasswordToken(user.id);

    if (!resetPasswordToken) {
      this.logger.error('Failed to create reset password token.');
      throw new InternalServerErrorException(
        'Failed to request password change.',
      );
    }

    const eventParams: AuthEventsPayload = {
      url: resetPasswordUrl,
      email: user.email,
      name: user.first_name || user.last_name || user.username,
    };

    this.eventEmitter.emit(SecurityEvents.PASSWORD_CHANGED, eventParams);

    return {
      url: resetPasswordUrl,
      token: resetPasswordToken,
    };
  }

  /**
   * Handles the forgot password flow, given an email address.
   * Validates the email address, generates a password reset token,
   * and sends an email with a reset password link.
   *
   * @param email - The email address to validate.
   * @returns A promise that resolves with void.
   */
  async forgotPassword(email: string): Promise<verificationTokens | void> {
    const existingUser =
      await this.userRepository.findNotDeletedNotBannedByEmail(email);

    if (!existingUser) return;

    // create password reset token
    const { token: resetPasswordToken, url: resetPasswordUrl } =
      await this.createResetPasswordToken(existingUser.id);

    if (!resetPasswordToken) {
      this.logger.error('Failed to create reset password token.');
      throw new InternalServerErrorException(
        'Failed to request forget password.',
      );
    }

    const eventParams: AuthEventsPayload = {
      url: resetPasswordUrl,
      email: existingUser.email,
      name:
        existingUser.first_name ||
        existingUser.last_name ||
        existingUser.username,
    };

    this.eventEmitter.emit(SecurityEvents.PASSWORD_FORGOT, eventParams);

    return {
      url: resetPasswordUrl,
      token: resetPasswordToken,
    };
  }

  /**
   * Handles the reset password flow, given a new password and a reset token.
   * Validates the reset token, updates the user's password, and generates
   * new access and refresh tokens.
   *
   * @param newPassword - The new password to set.
   * @param token - The reset token to validate.
   * @returns A promise that resolves with an object containing the new
   * access and refresh tokens.
   */
  async resetPassword(newPassword: string, token: string): Promise<AuthTokens> {
    const tokenHash = this.tokenService.hashToken(token);

    const resetToken: AuthToken | null = await this.tokenRepo.findOne({
      where: {
        token_hash: tokenHash,
        type: AuthTokenType.PASSWORD_RESET,
        expires_at: MoreThan(new Date()),
      },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or Expired Reset Token');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: {
          id: resetToken.user_id,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          username: true,
          email: true,
          status: true,
          password_hash: true,
          last_security_action_at: true,
        },
      });

      if (!user || user.status === AccountStatus.SOFT_DELETED) {
        throw new BadRequestException('User not found.');
      }

      if (user.status === AccountStatus.BANNED) {
        throw new BadRequestException('User is banned.');
      }

      // burn reset token + update password in one transaction.
      await queryRunner.manager.remove(AuthToken, resetToken);

      // Invalidate ALL existing refresh tokens for this user so that
      // any stolen sessions are immediately revoked on password change.
      await queryRunner.manager.delete(AuthToken, {
        user_id: user.id,
        type: AuthTokenType.REFRESH,
      });

      user.password_hash = await hashPassword(newPassword);
      user.last_security_action_at = updateSecurityActionTime();
      await queryRunner.manager.save(User, user);

      // Issue new refresh token inside the transaction.
      const rawRefreshToken = await this.tokenService.createRefreshToken(
        user.id,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      const accessToken = this.tokenService.createAccessTokenOrThrow(
        this.buildAccessPayload(user),
      );

      this.eventEmitter.emit(SecurityEvents.USER_SECURITY_UPDATE, {
        user_id: user.id,
        action: 'password-reset',
      });

      return { accessToken, refreshToken: rawRefreshToken };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generate and save user's password reset token.
   * @param userId The User that password reset token belongs to.
   * @returns {Promise<string>}. The generated password reset token.
   */
  private async createResetPasswordToken(
    userId: string,
  ): Promise<verificationTokens> {
    const token: string = this.tokenService.generateRandomToken();

    const tokenRecord: CreateTokenDto = {
      user_id: userId,
      type: AuthTokenType.PASSWORD_RESET,
      token,
    };

    const url = this.embedTokenIntoUrl('auth/reset-password', token);

    await this.tokenService.createTokenRecord(tokenRecord);

    return { token, url };
  }

  /**
   * Generate and save user's email verification token.
   * Trigger to sendEmailVerification event
   * @param user The User that email verification token belongs to.
   * @returns {Promise<void>}.
   */
  private async createEmailVerificationTokenAndUrl(
    user: User,
    manager = this.dataSource.manager,
  ): Promise<verificationTokens> {
    const token = this.tokenService.generateRandomToken();
    const url = this.embedTokenIntoUrl('auth/email/verify', token);

    await this.tokenService.createTokenRecord(
      {
        user_id: user.id,
        type: AuthTokenType.EMAIL_VERIFY,
        token,
      },
      manager,
    );

    return { token, url };
  }

  /**
   * @private
   * Generates a secure token and constructs its full verification URL.
   *
   * This helper is generic and can be used for:
   * - Email verification, Password reset or other token-based verification
   *
   * @param {string} route - The specific API route (e.g., 'verify-email', 'reset-password').
   * @param {string} token - The token to be embedded in the URL.
   * @returns `url`: The full URL (to be sent in an email).
   */
  private embedTokenIntoUrl(route: string, token: string): string {
    const baseUrl: string = this.appConfig.baseUrl;
    const api: string = this.appConfig.apiPrefix;

    // BUG should be the frontend url
    // e.g: http://localhost:3000/auth/verify-email?token=...
    const url: string = `${baseUrl}/${api}/${route}?token=${token}`;

    return url;
  }

  /**
   * @private
   *
   * Build access token payload.
   * @param user The User that access token belongs to.
   * @returns {AccessTokenPayload}.
   */
  private buildAccessPayload(user: User): AccessTokenPayload {
    return {
      id: user.id,
      username: user.username,
      status: user.status,
      sys_role: user.system_role,
      club_id: user.club_id || null,
      mem_role: user.member_role || TeamRole.NONE,
    };
  }

  /**
   * @private
   *
   * Emits the verification-email event (fires AFTER the transaction commits to
   * avoid triggering side-effects that cannot be rolled back).
   */
  private emitVerificationEmail(user: User, url: string): void {
    const eventParams: AuthEventsPayload = {
      url,
      email: user.email,
      name: user.first_name || user.last_name || user.username,
    };
    this.eventEmitter.emit(
      SecurityEvents.EMAIL_VERIFICATION_REQUESTED,
      eventParams,
    );
  }

  /**
   * Logs out the user by revoking all refresh tokens and updating security timestamp.
   * This effectively invalidates all existing sessions.
   *
   * @param userId - The ID of the user logging out.
   */
  async logout(userId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Revoke ALL refresh tokens for this user
      await queryRunner.manager.delete(AuthToken, {
        user_id: userId,
        type: AuthTokenType.REFRESH,
      });

      // 2. Update last_security_action_at to invalidate any issued JWTs
      // that are checked against this timestamp (e.g. in refresh/guards)
      await queryRunner.manager.update(User, userId, {
        last_security_action_at: updateSecurityActionTime(),
      });

      await queryRunner.commitTransaction();

      this.eventEmitter.emit(SecurityEvents.LOGOUT, {
        user_id: userId,
        action: 'logout',
      });

      this.logger.info('User logged out and sessions revoked', { userId });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Logout failed', { userId });
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
