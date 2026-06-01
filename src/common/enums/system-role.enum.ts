/**
 * The role of the user in the system
 */
export enum SystemRole {
  USER = 'USER', // A normal club user (coach, player)
  REVIEWER = 'REVIEWER', // Can see and approve clubs
  ADMIN = 'ADMIN', // admin can do everything except deleting other admins
  SUPER_ADMIN = 'SUPER_ADMIN', // super-admin can do everything including deleting other admins
}

/**
 * Numeric weight hierarchy for SystemRole
 */
export enum SystemRoleWeight {
  USER = 1,
  REVIEWER = 2,
  ADMIN = 3,
  SUPER_ADMIN = 4,
}

/**
 * Maps SystemRole to its corresponding SystemRoleWeight.
 */
export const SYSTEM_ROLE_WEIGHTS: Record<SystemRole, number> = {
  [SystemRole.USER]: SystemRoleWeight.USER,
  [SystemRole.REVIEWER]: SystemRoleWeight.REVIEWER,
  [SystemRole.ADMIN]: SystemRoleWeight.ADMIN,
  [SystemRole.SUPER_ADMIN]: SystemRoleWeight.SUPER_ADMIN,
};

/**
 * Checks if the target role is strictly higher than the requester role.
 *
 * @param targetRole - The SystemRole of the target user.
 * @param requesterRole - The SystemRole of the requester.
 * @returns True if the target role is strictly higher, false otherwise.
 */
export const isRoleHigherThan = (
  targetRole: SystemRole,
  requesterRole: SystemRole,
): boolean => {
  return SYSTEM_ROLE_WEIGHTS[targetRole] > SYSTEM_ROLE_WEIGHTS[requesterRole];
};
