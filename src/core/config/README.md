# Config Module

This module is responsible for loading, parsing, and validating all application environment variables from the `.env` file.

## 1. Features

- **Type Safety**: Provides strongly-typed configuration classes (e.g., `AppConfig`, `DatabaseConfig`) instead of generic `ConfigService` lookups.
- **Validation**: Uses **Joi** schema validation to ensure all required environment variables are present and correct.
- **JSDocs**: All methods are fully documented for better developer experience (IntelliSense).
- **Global Access**: The `ConfigModule` is global, so you can inject config classes anywhere without importing `ConfigModule`.

## 2. Available Configurations

The module exports the following configuration services:

- `AppConfig`: Application-level settings (env, port, base URL, CORS).
- `DatabaseConfig`: Database connection URL.
- `MailConfig`: Mailer settings (host, port, user, auth).
- `TokenConfig`: Token secrets and TTLs (JWT, reset password, etc.).

## 3. How to Use

Inject the specific configuration class you need into your constructor. **Do not use `ConfigService` directly.**

### Example

```typescript
import { Injectable } from '@nestjs/common';
import { AppConfig } from 'src/core/config/configrations/app.config';
import { DatabaseConfig } from 'src/core/config/configrations/database.config';

@Injectable()
export class ExampleService {
  constructor(
    private readonly appConfig: AppConfig,
    private readonly dbConfig: DatabaseConfig,
  ) {}

  someMethod() {
    // Access typed properties directly
    if (this.appConfig.isProduction) {
      console.log('Running in production');
    }

    const dbUrl = this.dbConfig.url;
    console.log(`Connecting to: ${dbUrl}`);
  }
}
```

## 4. Environment Variables

The `env-validation.schema.ts` defines the allowed variables. Key enums like `AppEnv` are used for validation:

```typescript
export enum AppEnv {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TESTING = 'testing',
}
```
