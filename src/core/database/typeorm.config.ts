import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load the development environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env.development.local') });

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.join(__dirname, '/../../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '/migrations/*{.ts,.js}')],
  synchronize: false, // Always false when using migrations
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
});
