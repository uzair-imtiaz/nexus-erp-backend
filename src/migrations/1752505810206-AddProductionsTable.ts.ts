import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductionsTable.ts1752505810206 implements MigrationInterface {
    name = 'AddProductionsTable.ts1752505810206'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "production" ("id" SERIAL NOT NULL, "quantity" integer NOT NULL, "totalCost" numeric(5,2) NOT NULL DEFAULT '0', "code" character varying NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid, "formulation_id" integer, CONSTRAINT "UQ_1c5844edd3af3ee0e140b97e2bd" UNIQUE ("code"), CONSTRAINT "PK_722753196a878fa7473f0381da3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "production" ADD CONSTRAINT "FK_d5cf3d8c111e0a083311c8dfb09" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "production" ADD CONSTRAINT "FK_b63c5f1aa4d2e6bddcadd07a5f2" FOREIGN KEY ("formulation_id") REFERENCES "formulation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "production" DROP CONSTRAINT "FK_b63c5f1aa4d2e6bddcadd07a5f2"`);
        await queryRunner.query(`ALTER TABLE "production" DROP CONSTRAINT "FK_d5cf3d8c111e0a083311c8dfb09"`);
        await queryRunner.query(`DROP TABLE "production"`);
    }

}
