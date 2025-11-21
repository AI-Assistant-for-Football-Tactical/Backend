export enum ApplicationStatus {
  PENDING_DOCUMENTS = 'PENDING_DOCUMENTS', // User just signed up
  PENDING_REVIEW = 'PENDING_REVIEW', // User has uploaded docs
  DOCS_REQUESTED = 'DOCS_REQUESTED', // Reviewer rejected, needs new docs
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
