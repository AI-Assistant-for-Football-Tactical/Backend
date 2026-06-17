import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { SystemRole } from '../../../common/enums/system-role.enum';
import { AccountStatus } from '../../../common/enums/account-status.enum';
import { hashPassword } from '../../../utils/hash/password.hash';
import { UserRepository } from '../../user/repositories/user.repository';
import { Logger } from '@nestjs/common';
import { updateSecurityActionTime } from '../../auth/helpers/security.helper';

/**
 * Standalone seeder script to bootstrap the initial SUPER_ADMIN user.
 * This is required because public signup is restricted to normal USER roles.
 *
 * Usage: npx ts-node src/modules/admin/seeders/super-admin.seeder.ts
 * Environment Variables:
 * - INITIAL_ADMIN_EMAIL: The email for the super admin
 * - INITIAL_ADMIN_PASSWORD: The plain-text password for the super admin
 */
async function bootstrap() {
  const logger = new Logger('SuperAdminSeeder');

  // Create application context to access providers without starting the HTTP server
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userRepository = app.get(UserRepository);

    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;

    if (!email || !password) {
      logger.error(
        'Missing credentials: INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set.',
      );
      process.exit(1);
    }

    // Check if admin already exists
    const existing = await userRepository.internalRepo.findOneBy({ email });
    if (existing) {
      logger.warn(
        `User with email ${email} already exists. Skipping bootstrap.`,
      );
      return;
    }

    // Hash password and create record
    const password_hash = await hashPassword(password);

    await userRepository.internalRepo.insert({
      email,
      username: 'super_admin_1',
      password_hash,
      first_name: 'System',
      last_name: 'Administrator 1',
      system_role: SystemRole.SUPER_ADMIN,
      status: AccountStatus.ACTIVE,
      is_verified: true,
      last_security_action_at: updateSecurityActionTime(),
    });

    logger.log(`Successfully bootstrapped SUPER_ADMIN: ${email}`);
  } catch (error) {
    logger.error('Bootstrapping failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Bootstrapping failed:', err);
    process.exit(1);
  });
