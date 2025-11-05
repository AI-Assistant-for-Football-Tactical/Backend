# Database Module

This module is responsible for configuring and connecting the entire application to our **PostgreSQL** database using `TypeOrm`.

## How it Works: Asynchronous Setup

This module is set up using `TypeOrmModule.forRootAsync()`. it uses `imports: [ConfigModule]` and `inject: [ConfigService]` to **wait** until the `ConfigModule` has loaded and validated all our environment variables.

## Key Configuration

- **`type: 'postgres'`**: Specifies we are using a PostgreSQL database.
- **`url: configService.get('DATABASE_URL')`**: This is the most important line. It reads our single, unified connection string (which includes the user, password, host, and db name) directly from the `.env` file. This makes our app portable between development and production.
- **`autoLoadEntities: true`**: Automatically loads all entities (like `User`, `Club`, etc.) that are registered with `TypeOrmModule.forFeature()` in other modules. This means we don't have to manually maintain an `entities` array here.
- **`synchronize: ... === 'development'`**: This is a critical safety feature. When we are in `development`, `synchronize` is set to `true`, which automatically updates our database schema to match our entities (very convenient). In `production`, this is set to `false` to prevent accidental data loss. Production changes must be handled with database migrations.
- **`ssl: { rejectUnauthorized: false }`**: This is a required setting to allow our app to connect to our cloud-hosted **Neon** database, which enforces SSL.

## How to Use

You **do not** need to import this module anywhere.

This `DatabaseModule` is imported **once** by the `CoreModule` and is made globally available.

If you are working on a feature module (e.g., `UserModule`) and you need to access a database table, you simply import `TypeOrmModule.forFeature(...)` in _your_ module file. NestJS will automatically use the connection this `DatabaseModule` provides.

## Example: How to Use the Repository in a Service

Here is the full, two-step flow of how your UserModule and UserService work together.

### Step 1: The Module Registers the Entity

Your UserModule tells TypeORM, "I am responsible for the User entity."

```TypeScript
// src/user/user.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity'; // Your TypeORM entity
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // <-- You register the entity here
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService], // Export the service if other modules (like Auth) need it
})
export class UserModule {}
```

### Step 2: The Service Injects the Repository

Now that the User entity is registered, your UserService can inject the repository for it.

```TypeScript
// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  // 1. You inject the repository for the 'User' entity
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 2. Now you can use it to run any database query
  async findOneByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { email } });
  }
}
```
