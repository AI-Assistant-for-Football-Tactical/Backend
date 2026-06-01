import { IsEnum, IsUUID, ValidateIf, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageFilePurpose } from '../../../common/enums/storage-file-purpose.enum';
export class StorageSignatureReqDto {
  @ApiProperty({
    description: 'The purpose of the file being uploaded',
    enum: StorageFilePurpose,
    example: StorageFilePurpose.PROFILE_IMAGE,
  })
  @IsEnum(StorageFilePurpose, {
    message: `purpose must be one of: ${Object.values(StorageFilePurpose).join(', ')}`,
  })
  purpose: StorageFilePurpose;

  @ApiPropertyOptional({
    description:
      'The UUID of the target entity (required except when purpose is CLAIM_DOCUMENT)',
    example: 'e2e604f2-95f3-4fb0-86c3-1ad394ea7d08',
  })
  @ValidateIf(
    (o: StorageSignatureReqDto) =>
      o.purpose !== StorageFilePurpose.CLAIM_DOCUMENT,
  )
  @IsUUID('4', { message: 'entityId must be a valid UUID v4' })
  @IsOptional()
  entityId?: string;
}
