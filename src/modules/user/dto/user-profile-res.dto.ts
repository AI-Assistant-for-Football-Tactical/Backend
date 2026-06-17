import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '../../../common/enums/account-status.enum';
import { SystemRole } from '../../../common/enums/system-role.enum';
import { TeamRole } from '../../../common/enums/team-role.enum';
import { ClubStatus } from '../../club/constants/club-status.enum';
import { Expose, Type } from 'class-transformer';

class ClubResDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty({ description: 'Sofa Score Club ID', nullable: true })
  @Expose()
  sofa_score_club_id: string | null;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  logo_url: string | null;

  @ApiProperty({ enum: ClubStatus })
  @Expose()
  status: ClubStatus;
}

export class UserProfileResDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  email: string;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty()
  first_name: string;

  @Expose()
  @ApiProperty({ nullable: true })
  last_name: string | null;

  @Expose()
  @ApiProperty()
  is_verified: boolean;

  @Expose()
  @ApiProperty({ enum: AccountStatus })
  status: AccountStatus;

  @Expose()
  @ApiProperty()
  get is_club_member(): boolean {
    return !!this.club_id;
  }

  @Expose()
  @ApiProperty({ nullable: true })
  club_id: string | null;

  @Expose()
  @ApiProperty({ enum: TeamRole, nullable: true })
  member_role: TeamRole | null;

  @Expose()
  @ApiProperty({ enum: SystemRole })
  system_role: SystemRole;

  @Expose()
  @ApiProperty({ nullable: true })
  profile_image_url: string | null;

  @Expose()
  @Type(() => ClubResDto)
  @ApiProperty({ type: ClubResDto, required: false, nullable: true })
  club: ClubResDto | null;
}
