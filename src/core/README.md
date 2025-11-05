# Core Module

This is the `CoreModule` for the AI Assistant for Football Tactical Backend.

## 1\. What is this?

This module follows the NestJS design pattern for a `CoreModule`. Its one and only job is to **import, configure, and provide all essential, application-wide services** (like the database, configuration, and logger) that are needed by all other feature modules.

It is **imported ONCE** in the root `AppModule` and is marked as `@Global()` to make its services available to the entire application without needing to re-import it.

## 2\. What's Inside?

This module is an "aggregator" for the following infrastructure modules:

- **`ConfigModule`**: Loads and validates all environment variables from `.env` file.

- **`DatabaseModule`**: Configures and connects to our **PostgreSQL** database using `TypeORM`.

- **`LoggerModule`** : Sets up **nestjs-pino** as the global, application-wide logger. This gives us fast, colorful, and structured logs.

---

The folder structure of `core/` directory:

```
core/
    ├── config/
    │   ├── config.module.ts
    │   └── validation.schema.ts
    │
    ├── database/
    │   └── database.module.ts
    │
    ├── logger/
    │   └── logger.module.ts
    │
    └── core.module.ts

```
