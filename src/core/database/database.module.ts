import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig, AppConfig } from '../../core/config';

/**
 * Module for database configuration and connection.
 *
 * It is intended to be imported once into the `CoreModule`.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [DatabaseConfig, AppConfig],
      useFactory: (databaseConfig: DatabaseConfig, appConfig: AppConfig) => ({
        type: 'postgres',
        url: databaseConfig.url,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        autoLoadEntities: true, // no need for adding entities explicitly
        synchronize: appConfig.isDevelopment, // IMPORTANT: only use 'true' for development!
        ssl: {
          rejectUnauthorized: false, // Required for Neon
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
