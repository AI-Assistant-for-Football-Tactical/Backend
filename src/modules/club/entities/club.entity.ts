import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ClubStatus } from '../constants/club-status.enum';
import { User } from '../../user/entities/user.entity';
import { Claim } from '../../club-claim/entities/claim.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Represents a football club in the system.
 * Acts as the core multi-tenancy boundary — all tactical data is scoped by club_id.
 *
 * Each club is created through the Claim pipeline (one approved claim per club).
 * The owner can transfer ownership (succession) or dissolve the club.
 *
 * @field sofa_score_club_id - External SofaScore team ID for data sync
 * @field creator_id         - The user who originally submitted the claim (audit)
 * @field owner_id           - Current owner (changes on succession)
 *
 * @relation users  - All members of this club
 * @relation claims - Claim history (one APPROVED per club, business rule)
 *
 * Future relations (entities not yet created):
 * - analytics/reports: OneToMany — all AI tactical reports scoped to this club.
 *   Will be added when the pre-match / in-match / post-match modules are built.
 *   Each report will carry a club_id FK for multi-tenant isolation.
 */
@Entity('clubs')
export class Club extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  /** SofaScore external team ID for data sync */
  @Index()
  @Column({ type: 'varchar', length: 100 })
  sofa_score_club_id: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @Column({ type: 'uuid' })
  creator_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ type: 'uuid' })
  owner_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => User, (user) => user.club)
  users: User[];

  /** Claim history — one APPROVED claim per club (enforced by business logic) */
  @OneToMany(() => Claim, (claim) => claim.club)
  claims: Claim[];

  @Index()
  @Column({
    type: 'enum',
    enum: ClubStatus,
    default: ClubStatus.INACTIVE,
  })
  status: ClubStatus;
}
