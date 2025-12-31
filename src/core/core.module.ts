import { Module, Global } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './logger/logger.module';
import { JwtModule } from '@nestjs/jwt';

/**
 * Aggregates and globally provides core application modules (e.g., config, database, logger).
 */
@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, LoggerModule, JwtModule],
  exports: [ConfigModule, DatabaseModule, LoggerModule, JwtModule],
})
export class CoreModule {}
