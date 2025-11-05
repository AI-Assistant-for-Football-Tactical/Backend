import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

/**
 * Provides and configures the application-wide logger using `nestjs-pino`.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logLevel =
          configService.get<string>('NODE_ENV') === 'production'
            ? 'info'
            : 'debug';

        return {
          pinoHttp: {
            level: logLevel,
            transport: {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
              },
            },
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
