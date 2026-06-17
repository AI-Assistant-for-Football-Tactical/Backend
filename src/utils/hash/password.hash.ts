import * as bcrypt from 'bcrypt';
import { PASSWORD_HASH_SALT_ROUNDS } from '../../modules/auth/constants/auth.constants';

/**
 * Hashes a plain-text password using bcrypt.
 *
 * @param password The plain-text password to hash.
 * @returns {Promise<string>} The resulting password hash.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_HASH_SALT_ROUNDS);
}

/**
 * Compares a plain-text password against a stored bcrypt hash.
 *
 * @param password The plain-text password to check.
 * @param hash The stored hash to compare against, defaults to an empty string.
 * @returns {Promise<boolean>} True if the password matches the hash, false otherwise.
 */
export async function comparePassword(
  password: string,
  hash: string = '',
): Promise<boolean> {
  if (!password || !hash) {
    const missing = !password ? 'candidate password' : 'hashed password';
    console.error(`Password comparison failed: missing ${missing}`);
    return false;
  }

  return await bcrypt.compare(password, hash);
}
