import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup';
import express, { type Request, type Response } from 'express';

const server = express();

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  setupApp(app);
  await app.init();
};

const bootstrapPromise = bootstrap();

export default async (req: Request, res: Response) => {
  await bootstrapPromise;
  server(req, res);
};
