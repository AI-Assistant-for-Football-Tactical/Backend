import { Module } from '@nestjs/common';
import { ConfigModule, AppConfig } from '../config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { Request, Response } from 'express';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfig],
      useFactory: (appConfig: AppConfig) => {
        return {
          pinoHttp: {
            level: 'debug',

            // Request ID for tracing
            genReqId: (req) =>
              req.headers['x-request-id']?.toString() ??
              `${Date.now()}-${Math.random().toString(36).slice(2)}`,

            serializers: {
              req: (req: Request) => ({
                id: req.id,
                url: `${req.method} ${req.url}`,
                query: req.query.length ? req.query : undefined,
                userAgent: req.headers['user-agent'],
              }),
              res: (res: Response) => ({
                statusCode: res.statusCode,
              }),
            },

            transport: appConfig.isDevelopment
              ? {
                  targets: [
                    {
                      target: 'pino-pretty',
                      options: {
                        destination: './logs/dev.log',
                        mkdir: true,
                        colorize: false,
                        translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                        ignore: 'pid,hostname',
                      },
                    },

                    {
                      level: 'error',
                      target: 'pino-pretty',
                      options: {
                        destination: './logs/error.log',
                        mkdir: true,
                        colorize: false,
                        translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                        ignore: 'pid,hostname',
                      },
                    },
                  ],
                }
              : undefined,
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
