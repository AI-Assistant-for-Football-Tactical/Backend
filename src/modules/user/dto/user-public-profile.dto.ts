import { ApiProperty } from '@nestjs/swagger';
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
}

export class UserPublicProfileResDto {
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
  @ApiProperty({ nullable: true })
  club_id: string | null;

  @Expose()
  @ApiProperty()
  get is_club_member(): boolean {
    return !!this.club_id;
  }

  @Expose()
  @ApiProperty({ nullable: true })
  profile_image_url: string | null;

  @Expose()
  @Type(() => ClubResDto)
  @ApiProperty({ type: ClubResDto, required: false, nullable: true })
  club: ClubResDto | null;
}
