import * as bcrypt from 'bcrypt';
import { MoreThan, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Token } from './entities/token.entity';
import { User } from '../user/entities/user.entity';
import { SignUpReqDto } from './dtos/sign-up.dto';
import type { CreateTokenDto } from './dtos/create-token.dto';
import { TokenType } from './constants/token-type.enum';
import { AuthEventsPayload } from './constants/auth-events-payload';
import { PASSWORD_HASH_SALT_ROUNDS } from './constants/auth.constants';
import { PinoLogger } from 'nestjs-pino';
import { TokenService } from './token.service';
import type { AccessTokenPayload } from './constants/token-payload.type';
import { UserService } from '../user/user.service';
import { AccountStatus } from '../user/constants/account-status.enum';
import type { AuthTokens } from './constants/auth-tokens.type';

@Injectable()
export class AuthService {
  /**
   * Constructs an instance of the AuthService.
   *
   * @param {Repository<User>} userRepo - The TypeORM repository for User entities.
   * @param {Repository<Token>} tokenRepo - The TypeORM repository for Token entities.
   * @param {EventEmitter2} eventEmitter - The event emitter for firing events.
   * @param {ConfigService} configService - The config service for accessing environment variables.
   * @param {PinoLogger} logger - The logger for logging events.
   * @param {TokenService} tokenService - The service for creating and managing tokens.
   * @param {UserService} userService - The service for managing user entities.
   */
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Token)
    private tokenRepo: Repository<Token>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  /**
   * Handles user registration, including data validation, user creation,
   * and initiating the email verification process.
   *
   * @param {SignUpReqDto} SignUpReqDto - The data transfer object containing user registration details.
   * @throws {ConflictException} If a user with the same email or username already exists.
   * @returns {Promise<void>} A promise that resolves when the sign-up process is complete.
   */
  async signUp(signUpDto: SignUpReqDto): Promise<AuthTokens> {
    this.logger.info('Attempting Sign Up:', {
      email: signUpDto.email,
    });

    const { password, ...userData } = signUpDto;

    // Check if user with the same email or username already exists
    const existingUser = await this.userRepo.findOne({
      where: [{ email: userData.email }, { username: userData.username }],
    });

    if (existingUser) {
      this.logger.error('Used Email or Username.');
      if (existingUser.email === signUpDto.email) {
        throw new ConflictException('Email already registered.');
      } else {
        throw new ConflictException('Username is already taken.');
      }
    }

    // Create and Save user to DB
    const newUser: User = this.userRepo.create({
      ...userData,
      password_hash: await this.hashPassword(password),
      last_security_action_at: new Date(),
    });

    await this.userRepo.save(newUser);

    // generate email verification token and send it
    await this.handleUserEmailVerification(newUser);

    // generate access and refresh tokens
    const accessToken = this.tokenService.createAccessToken(
      this.AccessPayload(newUser),
    );
    const refreshToken = await this.tokenService.createRefreshToken(newUser.id);

    return { accessToken, refreshToken };
  }

  /**
   * generates access and refresh tokens upon successful authentication.
   *
   * @param user - User's Data like (id, username)
   * @returns An object containing JWT access and random refresh tokens
   */
  async login(user: User): Promise<AuthTokens> {
    // Generate access and refresh tokens
    const payload = this.AccessPayload(user);

    const accessToken: string = this.tokenService.createAccessToken(payload);
    const refreshToken: string = await this.tokenService.createRefreshToken(
      user.id,
    );

    this.logger.info('LogIn:', { username: user.username });

    return { accessToken: accessToken, refreshToken: refreshToken };
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

    const qb = this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.status IN (:...statuses)', {
        statuses: [AccountStatus.ACTIVE, AccountStatus.PENDING_VERIFICATION],
      });

    // Build the Identity Check
    if (isEmail) {
      qb.andWhere('user.email = :identifier', { identifier });
    } else {
      qb.andWhere('user.username = :identifier', { identifier });
    }

    const user = await qb.getOne();

    if (!user) return null;

    const { password_hash, ...userData } = user;
    const isPassCorrect = await this.comparePassword(password, password_hash);

    return isPassCorrect ? userData : null;
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
    const user: User | null = await this.userRepo.findOne({
      where: { id: id, status: AccountStatus.PENDING_VERIFICATION },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const verifyToken: Token | null = await this.tokenRepo.findOne({
      where: {
        token_hash: this.tokenService.hashToken(token),
        user_id: user.id,
        type: TokenType.EMAIL_VERIFY,
        expires_at: MoreThan(new Date()),
      },
    });

    if (!verifyToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.is_verified = true;
    user.status = AccountStatus.ACTIVE;
    user.last_security_action_at = new Date();
    await Promise.all([
      this.tokenRepo.remove(verifyToken),
      this.userRepo.save(user),
    ]);

    this.eventEmitter.emit('security-update', {
      user_id: user.id,
      action: 'email-verified',
    });

    return user;
  }

  /**
   * Requests a new email verification token.
   *
   * @param id - The user's ID.
   * @throws {BadRequestException} If the user is invalid or already verified.
   */
  async requestEmailVerification(id: string): Promise<void> {
    const user: User | null = await this.userRepo.findOneBy({ id });

    if (!user) {
      throw new BadRequestException('Invalid user id.');
    }

    if (user.is_verified) {
      throw new BadRequestException('User is already verified.');
    }

    await this.handleUserEmailVerification(user);
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

    const token: Token | null = await this.tokenRepo.findOne({
      where: { token_hash: refreshTokenHash, type: TokenType.REFRESH },
    });

    if (!token || token.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Validate the user
    const user: User | null = await this.userService.findOneById(token.user_id);

    if (!user) {
      throw new BadRequestException('User Not Found.');
    }

    // Revoke the old refresh token
    await this.tokenRepo.remove(token);

    // Generate access and refresh tokens
    const payload = this.AccessPayload(user);

    const newAccessToken: string = this.tokenService.createAccessToken(payload);
    const newRefreshToken: string = await this.tokenService.createRefreshToken(
      user.id,
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Initiates the password change process by verifying the current password
   * and sending a reset password link to the user's email.
   *
   * @param userId - The user's ID.
   * @param currentPassword - The current password for verification.
   * @throws {BadRequestException} If the user is not found or password is invalid.
   */
  async changePassword(userId: string, currentPassword: string): Promise<void> {
    const user: User | null = await this.userRepo.findOne({
      where: { id: userId },
      select: {
        password_hash: true,
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        username: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPassCorrect = await this.comparePassword(
      currentPassword,
      user.password_hash,
    );

    if (!isPassCorrect) {
      throw new BadRequestException('Invalid current password');
    }

    // create password reset token
    const resetPasswordToken: string = await this.createResetPasswordToken(
      user.id,
    );

    if (!resetPasswordToken) {
      this.logger.error('Failed to create reset password token.');
      return;
    }

    const eventParams: AuthEventsPayload = {
      url: this.embedTokenIntoUrl('auth/reset-password', resetPasswordToken),
      email: user.email,
      name: user.first_name || user.last_name || user.username,
    };

    this.eventEmitter.emit('auth.change-password', eventParams);

    return;
  }

  /**
   * Handles the forgot password flow, given an email address.
   * Validates the email address, generates a password reset token,
   * and sends an email with a reset password link.
   *
   * @param email - The email address to validate.
   * @returns A promise that resolves with void.
   */
  async forgotPassword(email: string): Promise<void> {
    const existingUser: User | null = await this.userRepo.findOneBy({ email });

    if (!existingUser) return;

    // create password reset token
    const resetPasswordToken: string = await this.createResetPasswordToken(
      existingUser.id,
    );

    if (!resetPasswordToken) {
      this.logger.error('Failed to create reset password token.');
      return;
    }

    const eventParams: AuthEventsPayload = {
      url: this.embedTokenIntoUrl('auth/reset-password', resetPasswordToken),
      email: existingUser.email,
      name:
        existingUser.first_name ||
        existingUser.last_name ||
        existingUser.username,
    };

    this.eventEmitter.emit('auth.forgot-password', eventParams);

    return;
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
    const resetToken: Token | null = await this.tokenRepo.findOne({
      where: {
        token_hash: this.tokenService.hashToken(token),
        type: TokenType.PASSWORD_RESET,
        expires_at: MoreThan(new Date()),
      },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or Expired Reset Token');
    }

    await this.tokenRepo.remove(resetToken);

    const user: User | null = await this.userRepo.findOneBy({
      id: resetToken.user_id,
    });

    if (!user) {
      throw new BadRequestException('User Not Found.');
    }

    user.password_hash = await this.hashPassword(newPassword);
    user.last_security_action_at = new Date();

    await this.userRepo.save(user);

    this.eventEmitter.emit('security-update', {
      user_id: resetToken.user_id,
      action: 'password reset',
    });

    const refreshToken: string = await this.tokenService.createRefreshToken(
      resetToken.user_id,
    );
    const accessToken: string = this.tokenService.createAccessToken(
      this.AccessPayload(user),
    );

    return { accessToken, refreshToken };
  }

  /**
   * Generate and save user's password reset token.
   * @param userId The User that password reset token belongs to.
   * @returns {Promise<string>}. The generated password reset token.
   */
  private async createResetPasswordToken(userId: string): Promise<string> {
    const token: string = this.tokenService.generateRandomToken();

    const tokenRecord: CreateTokenDto = {
      user_id: userId,
      type: TokenType.PASSWORD_RESET,
      token,
    };

    await this.tokenService.createTokenRecord(tokenRecord);

    return token;
  }

  /**
   * Generate and save user's email verification token.
   * Trigger to sendEmailVerification event
   * @param user The User that email verification token belongs to.
   * @returns {Promise<void>}.
   */
  private async handleUserEmailVerification(user: User): Promise<void> {
    // delete old tokens
    await this.tokenRepo.delete({
      user_id: user.id,
      type: TokenType.EMAIL_VERIFY,
    });

    const token: string = this.tokenService.generateRandomToken();

    // Generate verification token and URL
    const url = this.embedTokenIntoUrl('auth/email/verify', token);

    await this.tokenService.createTokenRecord({
      user_id: user.id,
      type: TokenType.EMAIL_VERIFY,
      token,
    });

    const eventParams: AuthEventsPayload = {
      url,
      email: user.email,
      name: user.first_name || user.last_name || user.username,
    };

    // Fire event to (send email for verification)
    this.eventEmitter.emit('auth.verificationEmail', eventParams);
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
    const baseUrl: string = this.configService.get<string>('BASE_URL', '');
    const api: string = this.configService.get<string>('API', '');

    // BUG should be the frontend url
    // e.g: http://localhost:3000/api/v1/auth/verify-email?token=...
    const url: string = `${baseUrl}/${api}/${route}?token=${token}`;

    return url;
  }

  /**
   * Hashes a plain-text password using bcrypt.
   *
   * @param password The plain-text password to hash.
   * @returns {Promise<string>} The resulting password hash.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_HASH_SALT_ROUNDS);
  }

  /**
   * Compares a plain-text password against a stored bcrypt hash.
   *
   * @param password The plain-text password to check.
   * @param hash The stored hash to compare against, defaults to an empty string.
   * @returns {Promise<boolean>} True if the password matches the hash, false otherwise.
   */
  async comparePassword(password: string, hash: string = ''): Promise<boolean> {
    if (!password || !hash) {
      const missing = !password ? 'password' : 'hash';
      this.logger.error(`Password comparison failed: missing ${missing}`);
      return false; // safe fail for authentication
    }

    return await bcrypt.compare(password, hash);
  }

  private AccessPayload(user: User): AccessTokenPayload {
    return {
      id: user.id,
      username: user.username,
      status: user.status,
      sys_role: user.system_role,
      mem_role: user.memberships?.[0]?.role || undefined,
    };
  }
}
