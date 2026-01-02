import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

export function setupApp(app: INestApplication) {
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
}
