import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageFile } from '../entities/storage-file.entity';
import { User } from '../../user/entities/user.entity';
import { Club } from '../../club/entities/club.entity';
import { Claim } from '../../club-claim/entities/claim.entity';

/**
 * Data Transfer Object containing the confirmation result of a successful Cloudinary file upload.
 */
export class StorageConfirmResDto {
  /**
   * The created storage file log record
   */
  @ApiProperty({
    description: 'The created storage file log record',
  })
  file: StorageFile;

  /**
   * The updated database entity (User, Club, or Claim) or null if no sync was performed
   */
  @ApiPropertyOptional({
    description:
      'The updated database entity (User, Club, or Claim) or null if no sync was performed',
  })
  entity: User | Club | Claim | null;
}
