import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Club } from '../entities/club.entity';
import { User } from '../../user/entities/user.entity';
import { TeamRole } from '../../../common/enums/team-role.enum';
import { PaginatedResultDto } from '../../../common/dtos/pagination.dto';

/**
 * DTO for initiating club ownership succession.
 *
 * @field targetUserId - UUID of the STAFF member to promote to OWNER
 */
export class SuccessionDto {
  @ApiProperty({
    description: 'UUID of the STAFF member to be promoted to OWNER',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID('4')
  targetUserId: string;
}

/**
 * DTO for removing multiple STAFF members from a club.
 *
 * @field memberIds - UUIDs of the STAFF members to remove
 */
export class RemoveMembersDto {
  @ApiProperty({
    description: 'UUIDs of the STAFF members to remove from the club',
    example: [
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  memberIds: string[];
}

/**
 * Response DTO representing a club's public profile.
 */
export class ClubResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'Al Ahly SC' })
  name: string;

  @ApiPropertyOptional({ example: 'Egyptian football club' })
  description: string | null;

  @ApiProperty({ example: '12345' })
  sofa_score_club_id: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  logo_url: string | null;

  @ApiProperty({ example: 'uuid-of-owner' })
  owner_id: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  created_at: Date;

  static fromEntity(club: Club): ClubResponseDto {
    return {
      id: club.id,
      name: club.name,
      description: club.description,
      sofa_score_club_id: club.sofa_score_club_id,
      logo_url: club.logo_url,
      owner_id: club.owner_id,
      status: club.status,
      created_at: club.created_at,
    };
  }
}

/**
 * Response DTO representing a club member.
 */
export class ClubMemberResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'tactical_user' })
  username: string;

  @ApiProperty({ example: 'Mahmoud' })
  first_name: string;

  @ApiPropertyOptional({ example: 'Hassan' })
  last_name: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  profile_image_url: string | null;

  @ApiProperty({ enum: TeamRole, example: TeamRole.STAFF })
  member_role: TeamRole;

  static fromEntity(user: User): ClubMemberResponseDto {
    return {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_image_url: user.profile_image_url,
      member_role: user.member_role,
    };
  }
}

/**
 * Paginated list of club members response.
 */
export class PaginatedClubMembersResponseDto extends PaginatedResultDto {
  @ApiProperty({ type: [ClubMemberResponseDto] })
  members: ClubMemberResponseDto[];
}

/**
 * Paginated list of clubs response.
 */
export class PaginatedClubsResponseDto {
  @ApiProperty({ type: [ClubResponseDto] })
  clubs: ClubResponseDto[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
