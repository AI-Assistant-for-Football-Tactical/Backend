import { NotFoundException } from '@nestjs/common';
import { StorageSyncStrategy } from '../interfaces/storage-sync-strategy.interface';
import { ClubRepository } from '../../club/repositories/club.repository';
import { Club } from '../../club/entities/club.entity';

/**
 * Strategy implementation to synchronize logo assets for clubs.
 */
export class ClubLogoSyncStrategy implements StorageSyncStrategy {
  constructor(private readonly clubRepository: ClubRepository) {}

  /**
   * Synchronizes club logo image in the database.
   */
  async sync(entityId: string, secureUrl: string): Promise<Club> {
    const dbClub = await this.clubRepository.internalRepo.findOne({
      where: { id: entityId },
    });
    if (!dbClub) {
      throw new NotFoundException(`Club with ID ${entityId} not found.`);
    }
    dbClub.logo_url = secureUrl;
    return this.clubRepository.internalRepo.save(dbClub);
  }
}
