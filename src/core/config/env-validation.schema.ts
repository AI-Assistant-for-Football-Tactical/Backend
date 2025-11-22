import * as Joi from 'joi';

/**
 * Joi validation schema for environment variables.
 *
 * If any required variable is missing or fails validation, the application
 * will throw an error on startup, preventing it from running with an invalid state.
 */
export const envValidationSchema = Joi.object({
  // --- App Config ---
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(5050),
  BASE_URL: Joi.string().default('http://localhost:5050'),

  // --- Security & Auth ---
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  CORS_ORIGIN: Joi.string().required(),

  // --- DataBase - PostgreSQL ---
  DATABASE_URL: Joi.string().required(),

  // --- Email Service ---
  MAILER_HOST: Joi.string().required(),
  MAILER_PORT: Joi.number().required(),
  MAILER_USER: Joi.string().required(),
  MAILER_PASS: Joi.string().required(),
  MAILER_FROM_ADDRESS: Joi.string().email().required(),

  // --- Tokens life time ---
  EMAIL_VERIFY_TOKEN_EXPIRES_IN: Joi.string().required().default('1h'),
});
