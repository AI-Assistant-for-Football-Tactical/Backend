import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfig {
  constructor(private configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV')!;
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isTesting(): boolean {
    return this.nodeEnv === 'testing';
  }

  get port(): number {
    return this.configService.get<number>('PORT')!;
  }

  get baseUrl(): string {
    return this.configService.get<string>('BASE_URL')!;
  }

  get apiPrefix(): string {
    return this.configService.get<string>('API')!;
  }

  get corsOrigin(): string {
    return this.configService.get<string>('CORS_ORIGIN')!;
  }
}
