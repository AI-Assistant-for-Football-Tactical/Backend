import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropInvitationToken1779210000000 implements MigrationInterface {
  name = 'DropInvitationToken1779210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invitations" DROP COLUMN "token"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD "token" character varying(255)`,
    );
    await queryRunner.query(
      `UPDATE "invitations" SET "token" = "id"::text WHERE "token" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ALTER COLUMN "token" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "UQ_invitations_token" UNIQUE ("token")`,
    );
  }
}
