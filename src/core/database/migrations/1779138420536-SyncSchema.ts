import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncSchema1779138420536 implements MigrationInterface {
    name = 'SyncSchema1779138420536'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "storage_files" DROP CONSTRAINT "FK_92823dead24098dbae5477b983e"`);
        await queryRunner.query(`ALTER TABLE "storage_files" DROP CONSTRAINT "FK_7fca3481a98a74165222e830730"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_92823dead24098dbae5477b983"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7fca3481a98a74165222e83073"`);
        await queryRunner.query(`ALTER TABLE "storage_files" DROP COLUMN "claim_id"`);
        await queryRunner.query(`ALTER TABLE "storage_files" DROP COLUMN "club_id"`);
        await queryRunner.query(`ALTER TYPE "public"."claims_status_enum" RENAME TO "claims_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."claims_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')`);
        await queryRunner.query(`ALTER TABLE "claims" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "claims" ALTER COLUMN "status" TYPE "public"."claims_status_enum" USING "status"::"text"::"public"."claims_status_enum"`);
        await queryRunner.query(`ALTER TABLE "claims" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."claims_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."users_member_role_enum" RENAME TO "users_member_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."users_member_role_enum" AS ENUM('OWNER', 'STAFF', 'NONE')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "member_role" TYPE "public"."users_member_role_enum" USING "member_role"::"text"::"public"."users_member_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "member_role" SET DEFAULT 'NONE'`);
        await queryRunner.query(`DROP TYPE "public"."users_member_role_enum_old"`);
        await queryRunner.query(`UPDATE "users" SET "member_role" = 'NONE' WHERE "member_role" IS NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "member_role" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "member_role" SET DEFAULT 'NONE'`);
        await queryRunner.query(`ALTER TYPE "public"."invitations_role_enum" RENAME TO "invitations_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."invitations_role_enum" AS ENUM('OWNER', 'STAFF', 'NONE')`);
        await queryRunner.query(`ALTER TABLE "invitations" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invitations" ALTER COLUMN "role" TYPE "public"."invitations_role_enum" USING "role"::"text"::"public"."invitations_role_enum"`);
        await queryRunner.query(`ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'STAFF'`);
        await queryRunner.query(`DROP TYPE "public"."invitations_role_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."invitations_role_enum_old" AS ENUM('OWNER', 'STAFF')`);
        await queryRunner.query(`ALTER TABLE "invitations" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invitations" ALTER COLUMN "role" TYPE "public"."invitations_role_enum_old" USING "role"::"text"::"public"."invitations_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'STAFF'`);
        await queryRunner.query(`DROP TYPE "public"."invitations_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."invitations_role_enum_old" RENAME TO "invitations_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "member_role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "member_role" DROP NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."users_member_role_enum_old" AS ENUM('OWNER', 'STAFF')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "member_role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "member_role" TYPE "public"."users_member_role_enum_old" USING "member_role"::"text"::"public"."users_member_role_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."users_member_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_member_role_enum_old" RENAME TO "users_member_role_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."claims_status_enum_old" AS ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVOKED')`);
        await queryRunner.query(`ALTER TABLE "claims" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "claims" ALTER COLUMN "status" TYPE "public"."claims_status_enum_old" USING "status"::"text"::"public"."claims_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "claims" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."claims_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."claims_status_enum_old" RENAME TO "claims_status_enum"`);
        await queryRunner.query(`ALTER TABLE "storage_files" ADD "club_id" uuid`);
        await queryRunner.query(`ALTER TABLE "storage_files" ADD "claim_id" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_7fca3481a98a74165222e83073" ON "storage_files" ("club_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_92823dead24098dbae5477b983" ON "storage_files" ("claim_id") `);
        await queryRunner.query(`ALTER TABLE "storage_files" ADD CONSTRAINT "FK_7fca3481a98a74165222e830730" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "storage_files" ADD CONSTRAINT "FK_92823dead24098dbae5477b983e" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
