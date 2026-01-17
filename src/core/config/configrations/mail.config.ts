import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenConfig } from './token.config';

@Injectable()
export class MailConfig {
  constructor(
    private configService: ConfigService,
    private tokenConfig: TokenConfig,
  ) {}

  /**
   * Returns the mail host.
   *
   * @returns The mail host.
   */
  get host(): string {
    return this.configService.get<string>('MAILER_HOST')!;
  }

  /**
   * Returns the mail port.
   *
   * @returns The mail port.
   */
  get port(): number {
    return this.configService.get<number>('MAILER_PORT')!;
  }

  /**
   * Returns the mail user.
   *
   * @returns The mail user.
   */
  get user(): string {
    return this.configService.get<string>('MAILER_USER')!;
  }

  /**
   * Returns the mail password.
   *
   * @returns The mail password.
   */
  get password(): string {
    return this.configService.get<string>('MAILER_PASS')!;
  }

  /**
   * Returns the sender address.
   *
   * @returns The sender address.
   */
  get fromAddress(): string {
    return this.configService.get<string>('MAILER_FROM_ADDRESS')!;
  }

  /**
   * Returns the verification token TTL.
   *
   * @returns The verification token TTL.
   */
  get verifyTokenTtl(): number {
    return this.tokenConfig.emailVerifyTtl;
  }
}
