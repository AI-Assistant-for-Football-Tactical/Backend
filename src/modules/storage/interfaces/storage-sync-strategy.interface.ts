import { User } from '../../user/entities/user.entity';
import { Club } from '../../club/entities/club.entity';
import { Claim } from '../../club-claim/entities/claim.entity';

/**
 * Strategy interface for synchronizing database entities with uploaded storage assets.
 */
export interface StorageSyncStrategy {
  /**
   * Synchronizes the target database record with the uploaded file secure URL.
   *
   * @param entityId - The ID of the target entity (User, Club, or Claim)
   * @param secureUrl - The secure URL returned by Cloudinary
   * @returns A promise resolving to the updated database record
   */
  sync(entityId: string, secureUrl: string): Promise<User | Club | Claim>;
}
