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
  API: Joi.string().default('api/v1'),

  // --- Security & Auth ---
  ACCESS_TOKEN_SECRET: Joi.string().required(),
  ACCESS_TOKEN_TTL: Joi.number().required().default(900), // 15 min
  REFRESH_TOKEN_SECRET: Joi.string().required(),
  REFRESH_TOKEN_TTL: Joi.number().required().default(604800), // 7 days
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
  EMAIL_VERIFY_TOKEN_TTL: Joi.number().required().default(900),

  // --- Reset Password Token ---
  PASSWORD_RESET_TOKEN_TTL: Joi.number().required().default(900),
});
