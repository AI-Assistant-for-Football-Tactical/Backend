import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { StorageSignatureReqDto } from './dto/storage-signature-req.dto';
import { StorageSignatureResDto } from './dto/storage-signature-res.dto';
import { StorageConfirmReqDto } from './dto/storage-confirm-req.dto';
import { StorageConfirmResDto } from './dto/storage-confirm-res.dto';
import { StorageFilePurpose } from '../../common/enums/storage-file-purpose.enum';
import { StorageFileRepository } from './repositories/storage-file.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { ClubRepository } from '../club/repositories/club.repository';
import { ClaimRepository } from '../club-claim/repositories/claim.repository';
import { AccessTokenPayload } from '../auth/constants/token-payload.type';
import { SystemRole } from '../../common/enums/system-role.enum';
import { User } from '../user/entities/user.entity';
import { Club } from '../club/entities/club.entity';
import { Claim } from '../club-claim/entities/claim.entity';
import { CloudinaryConfig } from '../../core/config/configrations';
import { getCloudinaryFolder } from '../../common/utils/storage.util';
import { StorageSyncStrategy } from './interfaces/storage-sync-strategy.interface';
import { ProfileImageSyncStrategy } from './strategies/profile-image-sync.strategy';
import { ClubLogoSyncStrategy } from './strategies/club-logo-sync.strategy';
import { ClaimDocumentSyncStrategy } from './strategies/claim-document-sync.strategy';

/**
 * Service managing storage operations, including Cloudinary signed upload generation
 * and database synchronization for uploaded assets.
 */
@Injectable()
export class StorageService {
  private readonly strategies: Record<StorageFilePurpose, StorageSyncStrategy>;

  constructor(
    private readonly cloudinaryConfig: CloudinaryConfig,
    private readonly storageFileRepository: StorageFileRepository,
    private readonly userRepository: UserRepository,
    private readonly clubRepository: ClubRepository,
    private readonly claimRepository: ClaimRepository,
  ) {
    this.strategies = {
      [StorageFilePurpose.PROFILE_IMAGE]: new ProfileImageSyncStrategy(
        this.userRepository,
      ),
      [StorageFilePurpose.CLUB_LOGO]: new ClubLogoSyncStrategy(
        this.clubRepository,
      ),
      [StorageFilePurpose.CLAIM_DOCUMENT]: new ClaimDocumentSyncStrategy(
        this.claimRepository,
      ),
    };
  }

  /**
   * Generates a signed upload signature, timestamp, and semantic public_id for Cloudinary.
   *
   * @param user - The authenticated user requesting the signature
   * @param query - The request parameters (purpose, entityId)
   * @returns The signed parameters and configuration needed by the frontend
   * @throws {ForbiddenException} If the user is not authorized to upload for the specified entity
   */
  async getSignature(
    user: AccessTokenPayload,
    query: StorageSignatureReqDto,
  ): Promise<StorageSignatureResDto> {
    const { purpose, entityId } = query;

    // 1. Enforce business entity access controls
    if (entityId) await this.validateEntityAccess(user, purpose, entityId);

    // 2. Resolve Cloudinary credentials from configuration class
    const { apiKey, apiSecret, cloudName, overWrite } = this.cloudinaryConfig;

    // 3. Resolve target Cloudinary folder using shared helper
    const folder = getCloudinaryFolder(purpose);

    // 4. Generate a semantic public_id using entity ID, purpose, and timestamp
    const timestamp = Math.round(Date.now() / 1000);
    const purposeSnake = purpose.toLowerCase().replace(/_/g, '_');
    const publicId = `${entityId || 'temp'}_${purposeSnake}_${timestamp}`;

    // 5. Build parameter set to sign alphabetically
    const paramsToSign = {
      folder,
      overwrite: overWrite,
      public_id: publicId,
      timestamp,
    };

    // 6. Compute secure SHA-1 signature
    const signature = this.generateCloudinarySignature(paramsToSign, apiSecret);

    return {
      signature,
      timestamp,
      public_id: publicId,
      folder,
      cloud_name: cloudName,
      api_key: apiKey,
      upload_url: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      overwrite: overWrite as 'true' | 'false',
    };
  }

  /**
   * Confirms a successful Cloudinary upload and synchronizes the relevant database row.
   *
   * @param user - The authenticated user confirming the upload
   * @param body - The confirmation payload (url, public_id, purpose, entityId, etc.)
   * @returns A status message and the synchronized database record
   * @throws {ForbiddenException} If the user is not authorized to update the specified entity
   * @throws {NotFoundException} If the target user, club, or claim entity is not found
   */
  async confirmUpload(
    user: AccessTokenPayload,
    body: StorageConfirmReqDto,
  ): Promise<StorageConfirmResDto> {
    const {
      purpose,
      entityId,
      public_id,
      secure_url,
      original_name,
      mime_type,
      size_bytes,
    } = body;

    // 1. Enforce business entity access controls
    if (entityId) await this.validateEntityAccess(user, purpose, entityId);

    // 1b. Enforce signature timeframe expiration (e.g. 5 minutes / 300 seconds)
    const parts = public_id.split('_');
    const timestampStr = parts[parts.length - 1];
    const timestamp = parseInt(timestampStr, 10);
    if (!isNaN(timestamp)) {
      const currentTimestamp = Math.round(Date.now() / 1000);
      const ageSeconds = currentTimestamp - timestamp;
      if (ageSeconds > 300) {
        throw new BadRequestException(
          'The upload signature has expired (valid for 5 minutes).',
        );
      }
      if (ageSeconds < -60) {
        throw new BadRequestException('Invalid signature timestamp.');
      }
    }

    // 1c. Prevent double-use of the same upload signature
    const existingFile = await this.storageFileRepository.internalRepo.findOne({
      where: { file_key: public_id },
    });
    if (existingFile) {
      throw new BadRequestException(
        'This upload signature has already been used and confirmed.',
      );
    }

    // 2. Synchronize database row based on purpose using Strategy Pattern if entityId is present
    let updatedEntity: User | Club | Claim | null = null;
    if (entityId) {
      const strategy = this.strategies[purpose];
      updatedEntity = await strategy.sync(entityId, secure_url);
    }

    // 3. Create a persistent StorageFile transaction log
    const isSensitive = purpose === StorageFilePurpose.CLAIM_DOCUMENT;
    const storageFile = this.storageFileRepository.internalRepo.create({
      uploaded_by_id: user.id,
      purpose,
      file_key: public_id,
      original_name: original_name || public_id,
      mime_type: mime_type || this.inferMimeType(secure_url),
      size_bytes: size_bytes || 0,
      public_url: isSensitive ? null : secure_url, // Null for sensitive documents
    });

    const savedFile = await this.storageFileRepository.save(storageFile);

    return {
      file: savedFile,
      entity: updatedEntity,
    };
  }

  /**
   * Validates if the current user has access to upload/update the given entity.
   */
  private async validateEntityAccess(
    user: AccessTokenPayload,
    purpose: StorageFilePurpose,
    entityId: string,
  ): Promise<void> {
    // Admins have full access to manage storage
    if (user.sys_role === SystemRole.ADMIN) {
      return;
    }

    if (purpose === StorageFilePurpose.PROFILE_IMAGE) {
      // Users can only change their own profile picture
      if (user.id !== entityId) {
        throw new ForbiddenException(
          'You are not authorized to update profile images for another user.',
        );
      }
    } else if (purpose === StorageFilePurpose.CLUB_LOGO) {
      // Users must belong to the club they are trying to update
      if (user.club_id !== entityId) {
        throw new ForbiddenException(
          'You are not authorized to update logo assets for this club.',
        );
      }
    } else if (purpose === StorageFilePurpose.CLAIM_DOCUMENT) {
      // If the claim document exists, it must belong to the current user
      const claim = await this.claimRepository.internalRepo.findOne({
        where: { id: entityId },
      });
      if (claim && claim.user_id !== user.id) {
        throw new ForbiddenException(
          'You are not authorized to upload claim documents for this request.',
        );
      }
    }
  }

  /**
   * Performs an alphabetical parameter sort and SHA-1 hashing according to Cloudinary's protocol.
   */
  private generateCloudinarySignature(
    params: Record<string, string | number>,
    apiSecret: string,
  ): string {
    const sortedKeys = Object.keys(params).sort();
    const serialized = sortedKeys
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    // Append API secret directly
    const signaturePayload = `${serialized}${apiSecret}`;

    return crypto.createHash('sha1').update(signaturePayload).digest('hex');
  }

  /**
   * Infers basic MIME types from URLs for tracking.
   */
  private inferMimeType(url: string): string {
    const lower = url.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'application/octet-stream';
  }
}
