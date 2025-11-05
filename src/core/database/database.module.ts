import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Module for database configuration and connection.
 *
 * It is intended to be imported once into the `CoreModule`.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),

        autoLoadEntities: true, // no need for adding entities explicitly
        synchronize: configService.get('NODE_ENV') === 'development', // IMPORTANT: only use 'true' for development!
        ssl: {
          rejectUnauthorized: false, // Required for Neon
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
