import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceCurrentSchema1779042828702 implements MigrationInterface {
  name = 'EnforceCurrentSchema1779042828702';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "storage_files" DROP CONSTRAINT "FK_92823dead24098dbae5477b983e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "storage_files" DROP CONSTRAINT "FK_7fca3481a98a74165222e830730"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_92823dead24098dbae5477b983"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7fca3481a98a74165222e83073"`,
    );
    await queryRunner.query(
      `ALTER TABLE "storage_files" DROP COLUMN "claim_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "storage_files" DROP COLUMN "club_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD "original_email" character varying(70)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "original_username" character varying(50)`,
    );

    await queryRunner.query(
      `ALTER TABLE "auth_tokens" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_tokens" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`,
    );

    // Alter all timestamp columns to use TIMESTAMP WITH TIME ZONE (timestamptz) safely
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `ALTER TABLE "clubs" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "clubs" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "clubs" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `ALTER TABLE "claims" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `ALTER TABLE "favorites" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `ALTER TABLE "storage_files" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "storage_files" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "storage_files" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `ALTER TABLE "invitations" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ALTER COLUMN "updated_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ALTER COLUMN "deleted_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `ALTER TABLE "auth_tokens" ALTER COLUMN "created_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_tokens" ALTER COLUMN "expires_at" TYPE TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert timestamp columns to TIMESTAMP without time zone
    await queryRunner.query(
      `ALTER TABLE "auth_tokens" ALTER COLUMN "expires_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_tokens" ALTER COLUMN "created_at" TYPE TIMESTAMP`,
    );

    await queryRunner.query(
      `ALTER TABLE "invitations" ALTER COLUMN "deleted_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ALTER COLUMN "updated_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ALTER COLUMN "created_at" TYPE TIMESTAMP`,
    );

    await queryRunner.query(
      `ALTER TABLE "storage_files" ALTER COLUMN "deleted_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "storage_files" ALTER COLUMN "updated_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "storage_files" ALTER COLUMN "created_at" TYPE TIMESTAMP`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "deleted_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "created_at" TYPE TIMESTAMP`,
    );

    await queryRunner.query(
      `ALTER TABLE "favorites" ALTER COLUMN "deleted_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ALTER COLUMN "updated_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ALTER COLUMN "created_at" TYPE TIMESTAMP`,
    );

    await queryRunner.query(
      `ALTER TABLE "clubs" ALTER COLUMN "deleted_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "clubs" ALTER COLUMN "updated_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "clubs" ALTER COLUMN "created_at" TYPE TIMESTAMP`,
    );

    await queryRunner.query(
      `ALTER TABLE "claims" ALTER COLUMN "deleted_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ALTER COLUMN "updated_at" TYPE TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "claims" ALTER COLUMN "created_at" TYPE TIMESTAMP`,
    );

    // Drop added columns
    await queryRunner.query(
      `ALTER TABLE "auth_tokens" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_tokens" DROP COLUMN "updated_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "original_username"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "original_email"`);

    // Re-add storage_files relations
    await queryRunner.query(`ALTER TABLE "storage_files" ADD "club_id" uuid`);
    await queryRunner.query(`ALTER TABLE "storage_files" ADD "claim_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_7fca3481a98a74165222e83073" ON "storage_files" ("club_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92823dead24098dbae5477b983" ON "storage_files" ("claim_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "storage_files" ADD CONSTRAINT "FK_7fca3481a98a74165222e830730" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "storage_files" ADD CONSTRAINT "FK_92823dead24098dbae5477b983e" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
