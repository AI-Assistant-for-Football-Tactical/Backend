import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup';
import express from 'express';

const app = express();

const createNestServer = async (expressInstance: express.Express) => {
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );
  setupApp(nestApp);
  await nestApp.init();
  return nestApp;
};

// Initialize the app
createNestServer(app)
  .then(() => console.log('NestJS App Initialized'))
  .catch((err) => console.error('NestJS App Initialization Failed', err));

// Export the app for Vercel
export default app;
