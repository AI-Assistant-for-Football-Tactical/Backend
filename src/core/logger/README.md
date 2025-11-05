# Logger Module

This module provides a logger for the entire application.

## 1\. What it is?

This module imports and configures `nestjs-pino`, which uses the **Pino** logger under the hood. It replaces the default NestJS logger.

## 2\. How to Use

You **do not** need to import this module anywhere else. It is already imported by the `CoreModule` and made global.

To use the logger in any service, controller, or guard:

1.  Import the built-in `Logger` from `@nestjs/common`.
2.  Instantiate it in your class, passing the class name as the `context`.

<!-- end list -->

```typescript
// src/auth/auth.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  // Instantiate the logger with the service's name as context
  private readonly logger = new Logger(AuthService.name);

  public async login(email: string) {
    this.logger.debug(`Starting login process for ${email}...`); // Only in dev

    try {
      // ... logic ...
      this.logger.log(`User ${email} logged in successfully.`);
    } catch (error) {
      this.logger.error(`Login failed for ${email}`, error.stack);
    }
  }
}
```

## 3\. Sample Output

Because we configured `pino-pretty`, this is what your logs will look like in your development terminal:

```bash
[Nest] 50342  - 11/05/2025, 10:45:00 AM   DEBUG [AuthService] Starting login process for test@example.com
[Nest] 50342  - 11/05/2025, 10:45:01 AM   ERROR [AuthService] Login failed for test@example.com
Error: User not found
    at UsersService.findOne (src/users/users.service.ts:25:15)
    at AuthService.login (src/auth/auth.service.ts:30:25)
[Nest] 50342  - 11/05/2025, 10:45:05 AM    INFO [ClubsService] New club application submitted by test@example.com
[Nest] 50342  - 11/05/2025, 10:45:10 AM    WARN [ClubsService] Club application missing required documents.
```
