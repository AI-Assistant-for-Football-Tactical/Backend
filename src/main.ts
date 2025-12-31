import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * The main entry point of the application.
 *
 * Key steps:
 * - Creates a NestJS application instance.
 * - Configures CORS based on the environment.
 * - Applies security middleware (helmet) and the custom logger.
 * - Sets up a global validation pipe with transformation enabled.
 * - Enables shutdown hooks for graceful application termination.
 * - Starts the server on the port specified in the environment variables.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService: ConfigService = app.get(ConfigService);
  const corsOptions =
    configService.get('NODE_ENV') !== 'production'
      ? { origin: configService.get<string>('CORS_ORIGIN') }
      : true;

  app.setGlobalPrefix('api/v1');

  // --- Configure Swagger (OpenAPI) Documentation ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Shalaboka_AI API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document); // api/docs

  // --- Apply Middlewares & Setups ---
  app.use(helmet());
  app.enableCors(corsOptions);

  // --- Apply Validators ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 1. Must use cookie-parser to see the 'cookies' object
  app.use(cookieParser());

  app.enableShutdownHooks();

  await app.listen(configService.get('PORT') || 5050);

  console.log(
    `\x1b[36mNODE_ENV:\x1b[0m \x1b[33m${configService.get('NODE_ENV')}\x1b[0m`,
    `| \x1b[36mPORT:\x1b[0m \x1b[33m${configService.get('PORT')}\x1b[0m`,
  );
}

bootstrap();
