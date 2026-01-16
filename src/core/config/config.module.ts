import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env-validation.schema';
import {
  AppConfig,
  DatabaseConfig,
  TokenConfig,
  MailConfig,
} from './configrations/index';

/**
 * Global module for application configuration.
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}.local`,
      validationSchema: envValidationSchema,
    }),
  ],
  providers: [AppConfig, DatabaseConfig, TokenConfig, MailConfig],
  exports: [AppConfig, DatabaseConfig, TokenConfig, MailConfig],
})
export class ConfigModule {}
