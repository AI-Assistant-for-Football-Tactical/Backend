import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from '../../../common/enums/account-status.enum';
import { SystemRole } from '../../../common/enums/system-role.enum';
import { TeamRole } from '../../../common/enums/team-role.enum';
import { UserPublicProfileResDto } from './user-public-profile.dto';
import {
  PaginationQueryDto,
  PaginatedResultDto,
} from '../../../common/dtos/pagination.dto';

/** Allowed fields for sorting users */
export enum UserSortField {
  CREATED_AT = 'created_at',
  EMAIL = 'email',
  USERNAME = 'username',
}

export class UserSearchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by email (partial match, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Filter by username (partial match, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'Filter by account status',
    enum: AccountStatus,
  })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @ApiPropertyOptional({
    description: 'Filter by system role',
    enum: SystemRole,
  })
  @IsOptional()
  @IsEnum(SystemRole)
  system_role?: SystemRole;

  @ApiPropertyOptional({
    description: 'Filter by member role',
    enum: TeamRole,
  })
  @IsOptional()
  @IsEnum(TeamRole)
  member_role?: TeamRole;

  @ApiPropertyOptional({
    description: 'Field to sort users by (whitelisted options only)',
    enum: UserSortField,
    default: UserSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(UserSortField)
  sortBy?: UserSortField = UserSortField.CREATED_AT;
}

export class UserSearchResultDto extends PaginatedResultDto {
  @ApiProperty({
    description: 'List of users (without club object).',
    type: [UserPublicProfileResDto],
  })
  users: Omit<UserPublicProfileResDto, 'club'>[];
}
