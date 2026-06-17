import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, ArrayMaxSize, IsUUID } from 'class-validator';

/**
 * DTO for bulk deleting user favorites.
 */
export class BulkDeleteFavoritesDto {
  /** Array of favorite record IDs to delete */
  @ApiProperty({
    description: 'Array of favorite record IDs to delete (maximum 20)',
    type: [String],
    example: ['d3b07384-d113-49c5-a5d6-e9c8a9a4b3d7'],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'IDs array must not be empty' })
  @ArrayMaxSize(20, {
    message: 'Cannot bulk delete more than 20 favorites at once',
  })
  @IsUUID('4', {
    each: true,
    message: 'Each favorite ID must be a valid UUID v4',
  })
  ids: string[];
}
