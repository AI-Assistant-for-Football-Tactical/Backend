import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenType } from '../../../modules/auth/constants/token-type.enum';

@Injectable()
export class TokenConfig {
  constructor(private configService: ConfigService) {}

  get accessSecret(): string {
    return this.configService.get<string>('ACCESS_TOKEN_SECRET')!;
  }

  get accessTtl(): number {
    return this.configService.get<number>('ACCESS_TOKEN_TTL')!;
  }

  get refreshSecret(): string {
    return this.configService.get<string>('REFRESH_TOKEN_SECRET')!;
  }

  get refreshTtl(): number {
    return this.configService.get<number>('REFRESH_TOKEN_TTL')!;
  }

  get passwordResetTtl(): number {
    return this.configService.get<number>('PASSWORD_RESET_TOKEN_TTL')!;
  }

  get emailVerifyTtl(): number {
    return this.configService.get<number>('EMAIL_VERIFY_TOKEN_TTL')!;
  }

  get invitationTtl(): number {
    return this.configService.get<number>('INVITATION_TOKEN_TTL')!;
  }

  /**
   * Returns the TTL for a given token type.
   *
   * @param type - The token type.
   * @returns The TTL for the given token type.
   */
  tokenTtl(type: TokenType): number {
    const ttl: number = this.TTL_MAP[type];

    if (!ttl) {
      throw new Error(`Invalid token type: ${type}`);
    }

    return ttl;
  }

  private readonly TTL_MAP: Record<TokenType, number> = {
    [TokenType.ACCESS]: this.accessTtl,
    [TokenType.REFRESH]: this.refreshTtl,
    [TokenType.PASSWORD_RESET]: this.passwordResetTtl,
    [TokenType.EMAIL_VERIFY]: this.emailVerifyTtl,
    [TokenType.INVITATION]: this.invitationTtl,
  };
}
