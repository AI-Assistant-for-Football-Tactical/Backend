import { NotFoundException } from '@nestjs/common';
import { StorageSyncStrategy } from '../interfaces/storage-sync-strategy.interface';
import { UserRepository } from '../../user/repositories/user.repository';
import { User } from '../../user/entities/user.entity';

/**
 * Strategy implementation to synchronize profile images for users.
 */
export class ProfileImageSyncStrategy implements StorageSyncStrategy {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Synchronizes user profile image in the database.
   */
  async sync(entityId: string, secureUrl: string): Promise<User> {
    const dbUser = await this.userRepository.internalRepo.findOne({
      where: { id: entityId },
    });
    if (!dbUser) {
      throw new NotFoundException(`User with ID ${entityId} not found.`);
    }
    dbUser.profile_image_url = secureUrl;
    return this.userRepository.internalRepo.save(dbUser);
  }
}
