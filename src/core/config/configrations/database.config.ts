import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig {
  constructor(private configService: ConfigService) {}

  get url(): string {
    return this.configService.get<string>('DATABASE_URL')!;
  }
}
