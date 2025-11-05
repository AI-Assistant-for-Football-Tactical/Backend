# Config Module

This module is responsible for loading, parsing, and validating all application environment variables from the `.env` file.

## 1\. What it is?

This module uses the official `@nestjs/config` package to:

1.  Load variables from a `.env` file (e.g., `.env.development.local`).
2.  Validate these variables against a **Joi** schema.
3.  Make the `ConfigService` available globally, so any other module can securely access environment variables like `DATABASE_URL` or `JWT_SECRET`.

If a required environment variable (like `DATABASE_URL`) is missing or invalid, this module will **throw an error and stop the app from starting**.

## 2\. What's Inside?

- **`config.module.ts`**: Imports and configures the `NestConfigModule.forRoot()` method, telling it where to find the `.env` file and what validation schema to use.
- **`validation.schema.ts`**: Contains the **Joi** validation schema. This is the "rulebook" that defines all required and optional environment variables and their types.

## 3\. How to Use

This module is imported by `CoreModule` and marked as `@Global()`, so you **do not need to import it** in your feature modules.

To use the `ConfigService` in any other service (e.g., `AuthService`), just inject it in the constructor:

```typescript
// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  // 1. Inject ConfigService in your constructor
  constructor(private readonly configService: ConfigService) {}

  login() {
    // 2. use it to get you config variables
    const jwtSecret = This.configService.get<string>('JWT_SECRET');
  }
}
```
