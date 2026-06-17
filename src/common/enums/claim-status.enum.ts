/**
 * Club Claim Status
 */
export enum ClaimStatus {
  PENDING = 'PENDING', // Default on register
  APPROVED = 'APPROVED', // Approved by admin
  REJECTED = 'REJECTED', // Rejected by admin
  REVOKED = 'REVOKED', // Revoked by user
}
