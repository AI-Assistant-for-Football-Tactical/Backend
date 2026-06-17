import { NotFoundException } from '@nestjs/common';
import { StorageSyncStrategy } from '../interfaces/storage-sync-strategy.interface';
import { ClaimRepository } from '../../club-claim/repositories/claim.repository';
import { Claim } from '../../club-claim/entities/claim.entity';

/**
 * Strategy implementation to synchronize verification document URLs for onboarding claims.
 */
export class ClaimDocumentSyncStrategy implements StorageSyncStrategy {
  constructor(private readonly claimRepository: ClaimRepository) {}

  /**
   * Appends verification document URL to claim record in the database.
   */
  async sync(entityId: string, secureUrl: string): Promise<Claim> {
    const dbClaim = await this.claimRepository.internalRepo.findOne({
      where: { id: entityId },
    });
    if (!dbClaim) {
      throw new NotFoundException(`Claim with ID ${entityId} not found.`);
    }

    if (!dbClaim.document_urls) {
      dbClaim.document_urls = [];
    }
    if (!dbClaim.document_urls.includes(secureUrl)) {
      dbClaim.document_urls.push(secureUrl);
    }
    return this.claimRepository.internalRepo.save(dbClaim);
  }
}
