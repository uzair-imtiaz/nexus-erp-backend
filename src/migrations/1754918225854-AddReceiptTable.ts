import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReceiptTable1754918225854 implements MigrationInterface {
    name = 'AddReceiptTable1754918225854'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "receipt" ("id" SERIAL NOT NULL, "ref" character varying, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "notes" character varying, "mode" "public"."receipt_mode_enum" NOT NULL DEFAULT 'cash', "amount" numeric(18,2) NOT NULL DEFAULT '0', "is_auto_generated" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "tenantId" uuid, "bank_id" integer, "journal_id" integer, "customer_id" integer, CONSTRAINT "REL_0f7e5e402633d49b24e3adcd2a" UNIQUE ("journal_id"), CONSTRAINT "PK_b4b9ec7d164235fbba023da9832" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "receipt" ADD CONSTRAINT "FK_35948ee1a4c6f324ba5672af6fd" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "receipt" ADD CONSTRAINT "FK_6b6d4aeed42c2f011247d07eb2e" FOREIGN KEY ("bank_id") REFERENCES "bank"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "receipt" ADD CONSTRAINT "FK_0f7e5e402633d49b24e3adcd2ab" FOREIGN KEY ("journal_id") REFERENCES "journal"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "receipt" ADD CONSTRAINT "FK_3c4513422190272ab9afb709119" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "receipt" DROP CONSTRAINT "FK_3c4513422190272ab9afb709119"`);
        await queryRunner.query(`ALTER TABLE "receipt" DROP CONSTRAINT "FK_0f7e5e402633d49b24e3adcd2ab"`);
        await queryRunner.query(`ALTER TABLE "receipt" DROP CONSTRAINT "FK_6b6d4aeed42c2f011247d07eb2e"`);
        await queryRunner.query(`ALTER TABLE "receipt" DROP CONSTRAINT "FK_35948ee1a4c6f324ba5672af6fd"`);
        await queryRunner.query(`DROP TABLE "receipt"`);
    }

}
