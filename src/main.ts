import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup';
import { AppConfig } from './core/config';

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

  const appConfig = app.get(AppConfig);

  await app.listen(appConfig.port);

  console.log(
    `\x1b[36mNODE_ENV:\x1b[0m \x1b[33m${appConfig.nodeEnv}\x1b[0m`,
    `| \x1b[36mPORT:\x1b[0m \x1b[33m${appConfig.port}\x1b[0m`,
  );
}

bootstrap();
