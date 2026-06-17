import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { StorageFilePurpose } from '../../../common/enums/storage-file-purpose.enum';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Tracks files uploaded to S3-compatible storage.
 * Used for claim verification documents, profile images, and club logos.
 *
 * @field file_key   - S3 object key (e.g. "claims/uuid/document.pdf")
 * @field public_url - Pre-built public URL for non-sensitive files (logos, profile pics).
 *                     Null for sensitive files that require signed URLs.
 *
 * @relation uploaded_by - The user who uploaded the file
 * @relation club        - Multi-tenancy scope (nullable for public users)
 * @relation claim       - Optional claim association for verification documents
 */
@Entity('storage_files')
export class StorageFile extends BaseEntity {
  /** Who uploaded this file */
  @Index()
  @Column({ type: 'uuid' })
  uploaded_by_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploaded_by: User;

  @Column({
    type: 'enum',
    enum: StorageFilePurpose,
  })
  purpose: StorageFilePurpose;

  /** cloudinary object key (e.g. "claims/uuid/document.pdf") */
  @Column({ type: 'varchar', length: 1024 })
  file_key: string;

  @Column({ type: 'varchar', length: 255 })
  original_name: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'integer' })
  size_bytes: number;

  /**
   * Pre-built public URL for non-sensitive files (club logos, profile images).
   * Null for sensitive files requiring signed URLs (claim documents).
   */
  @Column({ type: 'varchar', length: 2048, nullable: true })
  public_url: string | null;
}
