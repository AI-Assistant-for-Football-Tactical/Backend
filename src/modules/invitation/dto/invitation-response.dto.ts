import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus } from '../constants/invitation-status.enum';
import { TeamRole } from '../../../common/enums/team-role.enum';
import { Invitation } from '../entities/invitation.entity';
import { PaginatedResultDto } from '../../../common/dtos/pagination.dto';

/**
 * Lightweight DTO representing a club for nested serialization.
 */
export class ClubResponseMiniDto {
  @ApiProperty({ example: 'd3b07384-d113-4ec2-a5d6-c2a2b0e9f0e1' })
  id: string;

  @ApiProperty({ example: 'Al Ahly SC' })
  name: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logos/ahly.png' })
  logo_url: string | null;
}

/**
 * Lightweight DTO representing a user profile for nested serialization.
 */
export class UserResponseMiniDto {
  @ApiProperty({ example: 'c1b07384-d113-4ec2-a5d6-c2a2b0e9f0e1' })
  id: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'John' })
  first_name: string;

  @ApiPropertyOptional({ example: 'Doe' })
  last_name: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/profiles/john.png' })
  profile_image_url: string | null;
}

/**
 * Response DTO for the invited user when reviewing their pending invitations.
 * Hides internal tokens and includes rich inviter and club details.
 */
export class UserPendingInvitationResponseDto {
  @ApiProperty({ example: 'a2b16384-d113-4ec2-a5d6-c2a2b0e9f0e1' })
  id: string;

  @ApiProperty({ enum: InvitationStatus, example: InvitationStatus.PENDING })
  status: InvitationStatus;

  @ApiPropertyOptional({ example: 'Welcome to our club!' })
  note: string | null;

  @ApiProperty({ enum: TeamRole, example: TeamRole.STAFF })
  role: TeamRole;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z' })
  expires_at: Date;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ type: ClubResponseMiniDto })
  club: ClubResponseMiniDto;

  @ApiProperty({ type: UserResponseMiniDto })
  from_user: UserResponseMiniDto;

  /**
   * Maps an Invitation entity to a UserPendingInvitationResponseDto.
   */
  static fromEntity(entity: Invitation): UserPendingInvitationResponseDto {
    const dto = new UserPendingInvitationResponseDto();
    dto.id = entity.id;
    dto.status = entity.status;
    dto.note = entity.note;
    dto.role = entity.role;
    dto.expires_at = entity.expires_at;
    dto.created_at = entity.created_at;

    if (entity.club) {
      dto.club = {
        id: entity.club.id,
        name: entity.club.name,
        logo_url: entity.club.logo_url,
      };
    }

    if (entity.from_user) {
      dto.from_user = {
        id: entity.from_user.id,
        username: entity.from_user.username,
        first_name: entity.from_user.first_name,
        last_name: entity.from_user.last_name,
        profile_image_url: entity.from_user.profile_image_url,
      };
    }

    return dto;
  }
}

/**
 * Response DTO for the club manager reviewing sent invitations.
 * Includes status, target email, and details of the registered invitee.
 */
export class ClubSentInvitationResponseDto {
  @ApiProperty({ example: 'a2b16384-d113-4ec2-a5d6-c2a2b0e9f0e1' })
  id: string;

  @ApiProperty({ enum: InvitationStatus, example: InvitationStatus.PENDING })
  status: InvitationStatus;

  @ApiPropertyOptional({ example: 'Welcome to our club!' })
  note: string | null;

  @ApiProperty({ enum: TeamRole, example: TeamRole.STAFF })
  role: TeamRole;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z' })
  expires_at: Date;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: 'player1@example.com' })
  to_email: string;

  @ApiPropertyOptional({ type: UserResponseMiniDto })
  to_user: UserResponseMiniDto | null = null;

  /**
   * Maps an Invitation entity to a ClubSentInvitationResponseDto.
   */
  static fromEntity(entity: Invitation): ClubSentInvitationResponseDto {
    const dto = new ClubSentInvitationResponseDto();
    dto.id = entity.id;
    dto.status = entity.status;
    dto.note = entity.note;
    dto.role = entity.role;
    dto.expires_at = entity.expires_at;
    dto.created_at = entity.created_at;
    dto.to_email = entity.to_email;

    if (entity.to_user) {
      dto.to_user = {
        id: entity.to_user.id,
        username: entity.to_user.username,
        first_name: entity.to_user.first_name,
        last_name: entity.to_user.last_name,
        profile_image_url: entity.to_user.profile_image_url,
      };
    }

    return dto;
  }
}

/**
 * Full Response DTO for administrative system oversight.
 * Includes all DB columns, raw IDs, and the secure verification token.
 */
export class AdminInvitationResponseDto {
  @ApiProperty({ example: 'a2b16384-d113-4ec2-a5d6-c2a2b0e9f0e1' })
  id: string;

  @ApiProperty({ example: '4a2f8c5b6e4d5c...' })
  token: string;

  @ApiProperty({ enum: InvitationStatus, example: InvitationStatus.PENDING })
  status: InvitationStatus;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  status_changed_at: Date | null;

  @ApiPropertyOptional({ example: 'Welcome to our club!' })
  note: string | null;

  @ApiProperty({ enum: TeamRole, example: TeamRole.STAFF })
  role: TeamRole;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z' })
  expires_at: Date;

  @ApiProperty({ example: 'd3b07384-d113-4ec2-a5d6-c2a2b0e9f0e1' })
  club_id: string;

  @ApiProperty({ example: 'c1b07384-d113-4ec2-a5d6-c2a2b0e9f0e1' })
  from_user_id: string;

  @ApiPropertyOptional({ example: 'b0b07384-d113-4ec2-a5d6-c2a2b0e9f0e1' })
  to_user_id: string | null;

  @ApiProperty({ example: 'player1@example.com' })
  to_email: string;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  updated_at: Date;

  @ApiPropertyOptional({ type: ClubResponseMiniDto })
  club?: ClubResponseMiniDto;

  @ApiPropertyOptional({ type: UserResponseMiniDto })
  from_user?: UserResponseMiniDto;

  @ApiPropertyOptional({ type: UserResponseMiniDto })
  to_user?: UserResponseMiniDto | null;

  /**
   * Maps an Invitation entity to an AdminInvitationResponseDto.
   */
  static fromEntity(entity: Invitation): AdminInvitationResponseDto {
    const dto = new AdminInvitationResponseDto();
    dto.id = entity.id;
    dto.token = entity.token;
    dto.status = entity.status;
    dto.status_changed_at = entity.status_changed_at;
    dto.note = entity.note;
    dto.role = entity.role;
    dto.expires_at = entity.expires_at;
    dto.club_id = entity.club_id;
    dto.from_user_id = entity.from_user_id;
    dto.to_user_id = entity.to_user_id;
    dto.to_email = entity.to_email;
    dto.created_at = entity.created_at;
    dto.updated_at = entity.updated_at;

    if (entity.club) {
      dto.club = {
        id: entity.club.id,
        name: entity.club.name,
        logo_url: entity.club.logo_url,
      };
    }

    if (entity.from_user) {
      dto.from_user = {
        id: entity.from_user.id,
        username: entity.from_user.username,
        first_name: entity.from_user.first_name,
        last_name: entity.from_user.last_name,
        profile_image_url: entity.from_user.profile_image_url,
      };
    }

    if (entity.to_user) {
      dto.to_user = {
        id: entity.to_user.id,
        username: entity.to_user.username,
        first_name: entity.to_user.first_name,
        last_name: entity.to_user.last_name,
        profile_image_url: entity.to_user.profile_image_url,
      };
    }

    return dto;
  }
}

/**
 * Paginated list of invitations response for administrators.
 */
export class PaginatedAdminInvitationsResponseDto extends PaginatedResultDto {
  @ApiProperty({ type: [AdminInvitationResponseDto] })
  invitations: AdminInvitationResponseDto[];
}
