import { Entity, Column, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SystemRole } from '../../../common/enums/system-role.enum';
import { AccountStatus } from '../../../common/enums/account-status.enum';
import { TeamRole } from '../../../common/enums/team-role.enum';
import { Club } from '../../club/entities/club.entity';
import { Favorite } from './favorite.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Represents a registered user in the system.
 *
 * Users start as public (no club). They can submit a Claim to become a
 * club Owner, or be invited as Staff. All tactical data is scoped by
 * the user's club_id (logical multi-tenancy).
 *
 * @field email        - Unique login identifier
 * @field username     - Unique public handle
 * @field system_role  - Platform-level role (USER / REVIEWER / ADMIN)
 * @field member_role  - Club-level role (OWNER / STAFF), null if no club
 * @field status       - Account lifecycle state
 *
 * @relation club      - The club the user belongs to (nullable)
 * @relation favorites - User's favorited SofaScore entities
 */
@Entity('users')
export class User extends BaseEntity {
  // store original email if the user was soft-deleted
  @Column({ type: 'varchar', length: 70, nullable: true })
  original_email: string | null;

  // store original username if the user was soft-deleted
  @Column({ type: 'varchar', length: 50, nullable: true })
  original_username: string | null;

  @Column({ type: 'varchar', length: 70, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 200, select: false })
  password_hash: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  first_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  last_name: string | null;

  @Column({ default: false })
  is_verified: boolean;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.PENDING_VERIFICATION,
  })
  status: AccountStatus;

  @Column({ type: 'uuid', nullable: true })
  club_id: string | null;

  @ManyToOne(() => Club, (club) => club.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'club_id' })
  club: Club | null;

  @Column({ type: 'enum', enum: TeamRole, default: TeamRole.NONE })
  member_role: TeamRole;

  @Column({
    type: 'enum',
    enum: SystemRole,
    default: SystemRole.USER,
  })
  system_role: SystemRole;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  last_security_action_at: Date;

  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  profile_image_url: string | null;

  /** User's favorited SofaScore entities (leagues, teams, players) */
  @OneToMany(() => Favorite, (fav) => fav.user)
  favorites: Favorite[];
}
