import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Club } from '../../club/entities/club.entity';
import { InvitationStatus } from '../constants/invitation-status.enum';
import { TeamRole } from '../../../common/enums/team-role.enum';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Represents an invitation from a club owner/manager to a user.
 * Currently invitations target registered users only (by user ID).
 * The invited_email field is stored for future business designs
 * (e.g., inviting unregistered users via email link).
 *
 * @relation club      - The club this invitation is for
 * @relation from_user - The user who sent the invitation
 * @relation to_user   - The registered user being invited
 */
@Entity('invitations')
export class Invitation extends BaseEntity {
  @Index()
  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @Column({ type: 'timestamptz', nullable: true })
  status_changed_at: Date | null;

  /** Encrypted Optional note or description from the inviter */
  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  /** The role the invitee will receive upon acceptance */
  @Column({
    type: 'enum',
    enum: TeamRole,
    default: TeamRole.STAFF,
  })
  role: TeamRole;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  /** FK to clubs table */
  @Index()
  @Column({ type: 'uuid' })
  club_id: string;

  @ManyToOne(() => Club, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_id' })
  club: Club;

  /** FK to users table (who sent the invite) */
  @Column({ type: 'uuid' })
  from_user_id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_user_id' })
  from_user: User;

  /** FK to users table (registered user being invited) */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  to_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_user_id' })
  to_user: User | null;

  /**
   * Email of the invited user. Currently populated from the target user's
   * registered email. Reserved for future use (invite by email before registration).
   */
  @Index()
  @Column({ type: 'varchar', length: 70 })
  to_email: string;
}
