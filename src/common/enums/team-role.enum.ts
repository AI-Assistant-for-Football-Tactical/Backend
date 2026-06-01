/**
 * The role of the member in the club
 */
export enum TeamRole {
  OWNER = 'OWNER', // can do everything
  STAFF = 'STAFF', // can do everything except deleting other members
  NONE = 'NONE', // can do nothing
}
