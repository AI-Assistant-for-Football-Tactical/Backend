import {
  Entity,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Token } from '../../auth/entities/token.entity';
import { Member } from '../../member/entities/member.entity';
import { SystemRole } from '../constants/system-role.enum';
import { AccountStatus } from '../constants/account-status.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ select: false }) // Hide password from default queries
  password_hash: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ default: false })
  is_verified: boolean; // For email verification

  @Column({ default: false })
  is_2fa_enabled: boolean; // For 2-factor auth verification

  // --- NEW ACCOUNT STATUS ---
  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.PENDING_VERIFICATION,
  })
  status: AccountStatus;

  // --- NEW SYSTEM ROLE ---
  @Column({
    type: 'enum',
    enum: SystemRole,
    default: SystemRole.USER,
  })
  system_role: SystemRole;

  // A User can be a member of many clubs
  @OneToMany(() => Member, (member) => member.user, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  memberships: Member[];

  // A User can have many auth tokens (e.g., refresh tokens)
  @OneToMany(() => Token, (token) => token.user)
  tokens: Token[];

  @Column({ type: 'timestamptz', default: new Date() })
  last_security_action_at: Date;

  @Column({ nullable: true })
  profile_image_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date; // This will be null by default
}
