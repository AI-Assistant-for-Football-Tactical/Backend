import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Club } from '../../club/entities/club.entity';
import { ClaimStatus } from '../../../common/enums/claim-status.enum';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Represents a club ownership claim in the onboarding pipeline.
 *
 * Flow: User submits claim (PENDING) →
 *       APPROVED (club created, user becomes OWNER) or REJECTED.
 *       User can CANCEL while PENDING.
 *
 * @relation user     - The user who submitted the claim
 * @relation club     - The club linked on approval (null while pending)
 * @relation reviewer - The admin/reviewer who processed the claim
 */
@Entity('claims')
export class Claim extends BaseEntity {
  /** The user who submitted this claim */
  @Index()
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Club created/linked on approval. Null while pending. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  club_id: string | null;

  @ManyToOne(() => Club, (club) => club.claims, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'club_id' })
  club: Club | null;

  /** SofaScore external team ID the user is claiming */
  @Index()
  @Column({ type: 'varchar', length: 100 })
  sofa_score_team_id: string;

  /** Human-readable club name from SofaScore or user input */
  @Column({ type: 'varchar', length: 255 })
  club_name: string;

  /** Optional justification text explaining why the user should manage this club */
  @Column({ type: 'text', nullable: true })
  justification: string | null;

  /** URLs of uploaded verification documents (IDs, contracts, etc.) */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  document_urls: string[];

  @Index()
  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.PENDING,
  })
  status: ClaimStatus;

  /** Reason provided when a claim is rejected */
  @Column({ type: 'varchar', length: 500, nullable: true })
  rejection_reason: string | null;

  /** Admin/Reviewer who processed the claim */
  @Column({ type: 'uuid', nullable: true })
  reviewer_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;
}
