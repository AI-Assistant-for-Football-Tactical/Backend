import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenConfig } from '../../core/config';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger } from 'nestjs-pino';
import * as crypto from 'crypto';

import { Token } from './entities/token.entity';
import { CreateTokenDto } from './dtos/create-token.dto';
import { TokenType } from './constants/token-type.enum';
import type { AccessTokenPayload } from './constants/token-payload.type';

/**
 * Service responsible for managing authentication tokens.
 * Handles the creation of tokens (Access, Refresh, Verify_Email, etc).
 */
@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepo: Repository<Token>,
    private readonly tokenConfig: TokenConfig,
    private readonly logger: PinoLogger,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Persists a hashed token record into the database.
   * * @param dto - The token data including the raw token string.
   * @returns The saved Token entity.
   * @throws InternalServerErrorException if database persistence fails.
   */
  async createTokenRecord(dto: CreateTokenDto): Promise<Token> {
    const { token, ...tokenDto } = dto;

    // Handle expiration calculation if not provided
    if (!tokenDto.expires_at) {
      // Expects TTL in SECONDS from .env (e.g., REFRESH_TOKEN_TTL=604800)
      const tokenExpiresInSeconds = this.tokenConfig.tokenTtl(tokenDto.type);

      tokenDto.expires_at = new Date(Date.now() + tokenExpiresInSeconds * 1000);
    }

    /**
     * We hash the token using SHA-256 before storing it.
     * This protects against database leaks (Opaque Token pattern).
     */
    const hashedToken = this.hashToken(token);

    const tokenData: Partial<Token> = {
      token_hash: hashedToken,
      ...tokenDto,
    };

    try {
      const tokenInstance = this.tokenRepo.create(tokenData);
      console.log(tokenInstance);
      return await this.tokenRepo.save(tokenInstance);
    } catch (err) {
      this.logger.error('Failed to persist token record', err);
      throw new InternalServerErrorException('Could not save token record');
    }
  }

  /**
   * Generates a random opaque refresh token and saves its hash to the database.
   * * @param userId - The ID of the user owning the token.
   * @returns The raw (unhashed) random token string to be sent to the client.
   */
  async createRefreshToken(userId: string): Promise<string> {
    const token = this.generateRandomToken();

    await this.createTokenRecord({
      type: TokenType.REFRESH,
      user_id: userId,
      token,
      // expires_at: new Date(
      //   this.config.get<number>('REFRESH_TOKEN_TTL') + Date.now(),
      // ),
    });

    return token;
  }

  /**
   * Generates a signed JWT Access Token.
   * * @param payload - The data to be encoded within the JWT.
   * @returns A signed JWT string.
   * @throws InternalServerErrorException if signing fails.
   */
  createAccessToken(payload: AccessTokenPayload): string {
    try {
      return this.jwtService.sign(payload, {
        // expiresIn expects seconds if passed as a number
        expiresIn: this.tokenConfig.accessTtl,
        secret: this.tokenConfig.accessSecret,
      });
    } catch (err) {
      this.logger.error('Error creating access token', err);
      throw new InternalServerErrorException('Error creating access token');
    }
  }

  /**
   * Generates a cryptographically strong random string.
   * * @param bytes - The number of random bytes to generate.
   * @returns A hex string (length will be bytes * 2).
   */
  generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Hash the token using SHA-256.
   * * @param token - The token to be hashed.
   * @returns A Hashed hex string.
   */
  hashToken(token: string): string {
    try {
      return crypto.createHash('sha256').update(token).digest('hex');
    } catch (err) {
      this.logger.error('Error hashing token', err);
      throw new InternalServerErrorException('Error hashing token');
    }
  }
}
