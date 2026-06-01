import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsString } from 'class-validator';
import { InvitationStatus } from '../constants/invitation-status.enum';
import { PaginationQueryDto } from '../../../common/dtos/pagination.dto';

/**
 * Allowed fields for sorting invitations.
 */
export enum InvitationSortField {
  CREATED_AT = 'created_at',
  STATUS = 'status',
  EXPIRES_AT = 'expires_at',
}

/**
 * Data Transfer Object for querying and filtering invitations (Admin search).
 */
export class InvitationSearchQueryDto extends PaginationQueryDto {
  /**
   * Filter by invitation status.
   * @example 'PENDING'
   */
  @ApiPropertyOptional({
    description: 'Filter invitations by status',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;

  /**
   * Filter by club ID. Must be a valid UUID.
   * @example 'd3b07384-d113-4ec2-a5d6-c2a2b0e9f0e1'
   */
  @ApiPropertyOptional({
    description: 'Filter invitations by club ID',
    example: 'd3b07384-d113-4ec2-a5d6-c2a2b0e9f0e1',
  })
  @IsOptional()
  @IsUUID()
  club_id?: string;

  /**
   * Filter by target user email address (exact or partial matches).
   * @example 'player1@example.com'
   */
  @ApiPropertyOptional({
    description: 'Filter invitations by target email address',
    example: 'player1@example.com',
  })
  @IsOptional()
  @IsString()
  to_email?: string;

  /**
   * Field to sort invitations by. Overrides base class to restrict to specific whitelisted fields.
   * @example 'created_at'
   */
  @ApiPropertyOptional({
    description: 'Field to sort invitations by',
    enum: InvitationSortField,
    default: InvitationSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(InvitationSortField)
  sortBy?: InvitationSortField = InvitationSortField.CREATED_AT;
}

/**
 * Data Transfer Object for querying invitations sent by the manager's club.
 */
export class ClubSentInvitationSearchQueryDto extends PaginationQueryDto {
  /**
   * Filter by invitation status.
   * @example 'PENDING'
   */
  @ApiPropertyOptional({
    description: 'Filter invitations by status',
    enum: InvitationStatus,
    example: InvitationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;

  /**
   * Filter by target user email address (exact or partial matches).
   * @example 'player1@example.com'
   */
  @ApiPropertyOptional({
    description: 'Filter invitations by target email address',
    example: 'player1@example.com',
  })
  @IsOptional()
  @IsString()
  to_email?: string;

  /**
   * Field to sort invitations by.
   * @example 'created_at'
   */
  @ApiPropertyOptional({
    description: 'Field to sort invitations by',
    enum: InvitationSortField,
    default: InvitationSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(InvitationSortField)
  sortBy?: InvitationSortField = InvitationSortField.CREATED_AT;
}
