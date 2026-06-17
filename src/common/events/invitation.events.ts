/**
 * Invitation events list
 */
export const enum InvitationEvents {
  USER_INVITED = 'invitation.user-invited',
}

/**
 * Event emitted when a user is invited to a club.
 */
export interface UserInvitedEvent {
  /** The email of the invited user */
  email: string;
  /** Direct URL for the user to respond to the invitation */
  actionUrl: string;
  /** The name of the inviting club */
  clubName: string;
  /** The UUID of the club */
  clubId: string;
}
