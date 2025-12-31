import { SetMetadata } from '@nestjs/common';
import { MemberRole } from 'src/modules/member/constants/member-role.enum';
import { SystemRole } from 'src/modules/user/constants/system-role.enum';

export const ALLOWED_SYSTEM_ROLES_KEY = 'allowed_system_roles';
export const ALLOWED_MEMBER_ROLES_KEY = 'allowed_member_roles';

export const SysRoles = (...roles: SystemRole[]) =>
  SetMetadata(ALLOWED_SYSTEM_ROLES_KEY, roles);

export const MemberRoles = (...roles: MemberRole[]) =>
  SetMetadata(ALLOWED_MEMBER_ROLES_KEY, roles);
