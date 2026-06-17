import {
  IsEnum,
  IsUUID,
  IsString,
  IsUrl,
  IsOptional,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageFilePurpose } from '../../../common/enums/storage-file-purpose.enum';

/**
 * Data Transfer Object for confirming and synchronizing a successful Cloudinary file upload.
 */
export class StorageConfirmReqDto {
  /**
   * The purpose of the file being uploaded
   * @example 'PROFILE_IMAGE'
   */
  @ApiProperty({
    description: 'The purpose of the file being uploaded',
    enum: StorageFilePurpose,
    example: StorageFilePurpose.PROFILE_IMAGE,
  })
  @IsEnum(StorageFilePurpose, {
    message: `purpose must be one of: ${Object.values(StorageFilePurpose).join(', ')}`,
  })
  purpose: StorageFilePurpose;

  /**
   * The ID of the target entity (e.g. user_id for profiles, club_id for logos)
   * @example 'e2e604f2-95f3-4fb0-86c3-1ad394ea7d08'
   */
  @ApiPropertyOptional({
    description:
      'The UUID of the target entity (required except when purpose is CLAIM_DOCUMENT)',
    example: 'e2e604f2-95f3-4fb0-86c3-1ad394ea7d08',
  })
  @ValidateIf(
    (o: StorageConfirmReqDto) =>
      o.purpose !== StorageFilePurpose.CLAIM_DOCUMENT,
  )
  @IsUUID('4', { message: 'entityId must be a valid UUID v4' })
  entityId?: string;

  /**
   * The public_id of the uploaded file returned by Cloudinary
   * @example 'profile-image/e2e604f2-95f3-4fb0-86c3-1ad394ea7d08_profile_image_17181920'
   */
  @ApiProperty({
    description: 'The public_id returned by Cloudinary after successful upload',
    example:
      'profile-image/e2e604f2-95f3-4fb0-86c3-1ad394ea7d08_profile_image_17181920',
  })
  @IsString()
  public_id: string;

  /**
   * The secure URL of the uploaded file returned by Cloudinary
   * @example 'https://res.cloudinary.com/dpnrrr7lo/image/upload/v17181920/profile-image/e2e604f2-95f3-4fb0-86c3-1ad394ea7d08_profile_image_17181920.jpg'
   */
  @ApiProperty({
    description:
      'The secure URL returned by Cloudinary after successful upload',
    example:
      'https://res.cloudinary.com/dpnrrr7lo/image/upload/v17181920/profile-image/e2e604f2-95f3-4fb0-86c3-1ad394ea7d08_profile_image_17181920.jpg',
  })
  @IsUrl({}, { message: 'secure_url must be a valid URL' })
  secure_url: string;

  /**
   * The original name of the file before uploading
   * @example 'avatar.jpg'
   */
  @ApiProperty({
    description: 'The original name of the file',
    example: 'avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  original_name?: string;

  /**
   * The mime type of the file
   * @example 'image/jpeg'
   */
  @ApiProperty({
    description: 'The mime type of the file',
    example: 'image/jpeg',
    required: false,
  })
  @IsOptional()
  @IsString()
  mime_type?: string;

  /**
   * The size of the file in bytes
   * @example 204800
   */
  @ApiProperty({
    description: 'The size of the file in bytes',
    example: 204800,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  size_bytes?: number;
}
