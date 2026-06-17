export const enum SecurityEvents {
  SIGNUP = 'auth.signup',
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',

  PASSWORD_FORGOT = 'auth.password-forgot',
  PASSWORD_CHANGED = 'auth.password-changed',
  PASSWORD_CHANGE_REQUESTED = 'auth.password-change-requested',
  USER_SECURITY_UPDATE = 'auth.security-update',

  USER_DEACTIVATED = 'user.deactivated',
  USER_ACTIVATED = 'user.activated',

  EMAIL_VERIFIED = 'auth.email-verified',
  EMAIL_VERIFICATION_REQUESTED = 'auth.email-verification-requested',

  ADMIN_SECURITY_VIOLATION = 'admin.security-violation',
  ADMIN_USER_PROMOTED = 'admin.promoted',
  ADMIN_USER_STATUS_UPDATED = 'admin.status-updated',
}
