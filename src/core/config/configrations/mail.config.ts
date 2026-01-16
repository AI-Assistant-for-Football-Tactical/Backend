import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailConfig {
  constructor(private configService: ConfigService) {}

  get host(): string {
    return this.configService.get<string>('MAILER_HOST')!;
  }

  get port(): number {
    return this.configService.get<number>('MAILER_PORT')!;
  }

  get user(): string {
    return this.configService.get<string>('MAILER_USER')!;
  }

  get password(): string {
    return this.configService.get<string>('MAILER_PASS')!;
  }

  get fromAddress(): string {
    return this.configService.get<string>('MAILER_FROM_ADDRESS')!;
  }

  get verifyTokenTtl(): number {
    return this.configService.get<number>('EMAIL_VERIFY_TOKEN_TTL')!;
  }
}
