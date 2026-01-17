import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig {
  constructor(private configService: ConfigService) {}

  /**
   * Returns the database connection URL.
   *
   * @returns The database connection URL.
   */
  get url(): string {
    return this.configService.get<string>('DATABASE_URL')!;
  }
}
