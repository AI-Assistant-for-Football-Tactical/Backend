import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ClubStatus } from '../constants/club-status.enum';

/**
 * DTO for updating a club's status (Admin only).
 *
 * @field status - The new status to apply to the club
 */
export class UpdateClubStatusDto {
  @ApiProperty({
    description: 'The new club status',
    enum: ClubStatus,
    example: ClubStatus.ACTIVE,
  })
  @IsEnum(ClubStatus)
  status: ClubStatus;
}
