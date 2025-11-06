import { Module, Global } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './logger/logger.module';

/**
 * Aggregates and globally provides core application modules (e.g., config, database, logger).
 */
@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, LoggerModule],
})
export class CoreModule {}
