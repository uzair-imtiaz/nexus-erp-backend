import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCodeCounterTable1755760482511 implements MigrationInterface {
    name = 'AddCodeCounterTable1755760482511'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "code_counters" ("tenantId" uuid NOT NULL, "tableName" character varying NOT NULL, "lastValue" bigint NOT NULL DEFAULT '0', CONSTRAINT "PK_63efee027abb6470be01a6b42bc" PRIMARY KEY ("tenantId", "tableName"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "code_counters"`);
    }

}
