import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthTokenType } from '../../../modules/auth/constants/auth-token-type.enum';
import ms, { StringValue } from 'ms';

@Injectable()
export class AuthTokenConfig {
  constructor(private configService: ConfigService) {}

  /**
   * Returns the secret key for an access token.
   *
   * @returns The secret key for an access token.
   */
  get accessSecret(): string {
    return this.configService.get<string>('ACCESS_TOKEN_SECRET')!;
  }

  /**
   * Returns the TTL for an access token.
   *
   * @returns The TTL for an access token in milliseconds.
   */
  get accessTtl(): number {
    return this.configService.get<number>('ACCESS_TOKEN_TTL')!;
  }

  /**
   * Returns the secret key for a refresh token.
   *
   * @returns The secret key for a refresh token.
   */
  get refreshSecret(): string {
    return this.configService.get<string>('REFRESH_TOKEN_SECRET')!;
  }

  /**
   * Returns the TTL for a refresh token.
   *
   * @returns The TTL for a refresh token in milliseconds.
   */
  get refreshTtl(): number {
    const ttl: StringValue =
      this.configService.get<StringValue>('REFRESH_TOKEN_TTL')!;
    return ms(ttl);
  }

  /**
   * Returns the TTL for a password reset token.
   *
   * @returns The TTL for a password reset token in milliseconds.
   */
  get passwordResetTtl(): number {
    const ttl: StringValue = this.configService.get<StringValue>(
      'PASSWORD_RESET_TOKEN_TTL',
    )!;
    return ms(ttl);
  }

  /**
   * Returns the TTL for an email verification token.
   *
   * @returns The TTL for an email verification token in milliseconds.
   */
  get emailVerifyTtl(): number {
    const ttl: StringValue = this.configService.get<StringValue>(
      'EMAIL_VERIFY_TOKEN_TTL',
    )!;
    return ms(ttl);
  }

  /**
   * Returns the TTL for a given token type.
   *
   * @param type - The token type.
   * @returns The TTL for the given token type in milliseconds.
   */
  tokenTtl(type: AuthTokenType): number {
    const ttl: number = this.TTL_MAP[type];

    if (!ttl) {
      throw new Error(`Invalid token type: ${type}`);
    }

    return ttl;
  }

  private readonly TTL_MAP: Record<AuthTokenType, number> = {
    [AuthTokenType.ACCESS]: this.accessTtl,
    [AuthTokenType.REFRESH]: this.refreshTtl,
    [AuthTokenType.PASSWORD_RESET]: this.passwordResetTtl,
    [AuthTokenType.EMAIL_VERIFY]: this.emailVerifyTtl,
  };
}
