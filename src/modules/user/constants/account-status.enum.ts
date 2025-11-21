export enum AccountStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION', // Default on register
  ACTIVE = 'ACTIVE', // Verified and good to go
  BANED = 'BANED', // Banned by admin
  DEACTIVATED = 'DEACTIVATED', // Deactivated by the user
  SOFT_DELETED = 'SOFT_DELETED', // Deleted by the user
}
