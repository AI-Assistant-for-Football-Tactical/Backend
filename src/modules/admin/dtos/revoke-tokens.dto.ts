import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for revoking all refresh tokens in a given time slot.
 * If not provided, all active refresh tokens will be revoked.
 */
export class RevokeTokensByAdminDto {
  @ApiPropertyOptional({
    description: 'Start of the time slot to revoke tokens from (inclusive)',
    example: '2026-06-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End of the time slot to revoke tokens to (inclusive)',
    example: '2026-06-01T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
