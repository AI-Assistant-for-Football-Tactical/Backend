import { StorageFilePurpose } from '../enums/storage-file-purpose.enum';

/**
 * Maps a StorageFilePurpose to its respective Cloudinary folder name.
 *
 * @param purpose - The storage file purpose
 * @returns The Cloudinary folder name
 */
export function getCloudinaryFolder(purpose: StorageFilePurpose): string {
  const folderMap: Record<StorageFilePurpose, string> = {
    [StorageFilePurpose.CLAIM_DOCUMENT]: 'claim-document',
    [StorageFilePurpose.PROFILE_IMAGE]: 'profile-image',
    [StorageFilePurpose.CLUB_LOGO]: 'club-logo',
  };
  return folderMap[purpose];
}
