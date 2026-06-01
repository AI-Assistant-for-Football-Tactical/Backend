import { SetMetadata } from '@nestjs/common';
import { TeamRole } from '../enums/team-role.enum';
import { SystemRole } from '../enums/system-role.enum';

export const ALLOWED_SYSTEM_ROLES_KEY = 'allowed_system_roles';
export const ALLOWED_MEMBER_ROLES_KEY = 'allowed_member_roles';

/**
 * Decorator to require specific team roles for accessing a resource.
 * Accepts TeamRole values.
 */
export const RequireTeamRole = (...roles: TeamRole[]) =>
  SetMetadata(ALLOWED_MEMBER_ROLES_KEY, roles);

/**
 * Decorator to require specific system roles for accessing a resource.
 */
export const RequireSystemRole = (...roles: SystemRole[]) =>
  SetMetadata(ALLOWED_SYSTEM_ROLES_KEY, roles);
