import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEnv } from 'src/common/constants/app.constants';

@Injectable()
export class AppConfig {
  constructor(private configService: ConfigService) {}

  /**
   * Returns the node environment.
   *
   * @returns The node environment (e.g., 'development', 'production', 'testing').
   */
  get nodeEnv(): AppEnv {
    return this.configService.get<AppEnv>('NODE_ENV')!;
  }

  /**
   * Checks if the environment is production.
   *
   * @returns True if the environment is production, false otherwise.
   */
  get isProduction(): boolean {
    return this.nodeEnv === AppEnv.PRODUCTION;
  }

  /**
   * Checks if the environment is development.
   *
   * @returns True if the environment is development, false otherwise.
   */
  get isDevelopment(): boolean {
    return this.nodeEnv === AppEnv.DEVELOPMENT;
  }

  /**
   * Checks if the environment is testing.
   *
   * @returns True if the environment is testing, false otherwise.
   */
  get isTesting(): boolean {
    return this.nodeEnv === AppEnv.TESTING;
  }

  /**
   * Returns the port number for the application.
   *
   * @returns The port number.
   */
  get port(): number {
    return this.configService.get<number>('PORT')!;
  }

  /**
   * Returns the base URL of the application.
   *
   * @returns The base URL.
   */
  get baseUrl(): string {
    return this.configService.get<string>('BASE_URL')!;
  }

  /**
   * Returns the API prefix.
   *
   * @returns The API prefix.
   */
  get apiPrefix(): string {
    return this.configService.get<string>('API')!;
  }

  /**
   * Returns the CORS origin.
   *
   * @returns The CORS origin.
   */
  get corsOrigin(): string {
    return this.configService.get<string>('CORS_ORIGIN')!;
  }
}
