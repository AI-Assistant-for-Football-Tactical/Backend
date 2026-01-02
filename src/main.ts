import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupApp } from './setup';

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
  // --- Apply Setup (Middlewares, Pipes, Swagger) ---
  setupApp(app);

  app.enableShutdownHooks();

  const configService = app.get(ConfigService);

  await app.listen(configService.get('PORT') || 5050);

  console.log(
    `\x1b[36mNODE_ENV:\x1b[0m \x1b[33m${configService.get('NODE_ENV')}\x1b[0m`,
    `| \x1b[36mPORT:\x1b[0m \x1b[33m${configService.get('PORT')}\x1b[0m`,
  );
}

bootstrap();
