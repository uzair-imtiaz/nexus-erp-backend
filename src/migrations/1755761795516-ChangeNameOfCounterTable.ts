import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeNameOfCounterTable1755761795516 implements MigrationInterface {
    name = 'ChangeNameOfCounterTable1755761795516'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "code_counters" DROP CONSTRAINT "PK_63efee027abb6470be01a6b42bc"`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD CONSTRAINT "PK_ea7e720be5360d6d138a2889361" PRIMARY KEY ("tableName")`);
        await queryRunner.query(`ALTER TABLE "code_counters" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "code_counters" DROP COLUMN "lastValue"`);
        await queryRunner.query(`ALTER TABLE "code_counters" DROP CONSTRAINT "PK_ea7e720be5360d6d138a2889361"`);
        await queryRunner.query(`ALTER TABLE "code_counters" DROP COLUMN "tableName"`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD "tenant_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD CONSTRAINT "PK_446c03c6c93a9c5db68132df123" PRIMARY KEY ("tenant_id")`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD "table_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "code_counters" DROP CONSTRAINT "PK_446c03c6c93a9c5db68132df123"`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD CONSTRAINT "PK_a35ad362c4c332d700a5992a3d9" PRIMARY KEY ("tenant_id", "table_name")`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD "last_value" bigint NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "code_counters" DROP COLUMN "last_value"`);
        await queryRunner.query(`ALTER TABLE "code_counters" DROP CONSTRAINT "PK_a35ad362c4c332d700a5992a3d9"`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD CONSTRAINT "PK_446c03c6c93a9c5db68132df123" PRIMARY KEY ("tenant_id")`);
        await queryRunner.query(`ALTER TABLE "code_counters" DROP COLUMN "table_name"`);
        await queryRunner.query(`ALTER TABLE "code_counters" DROP CONSTRAINT "PK_446c03c6c93a9c5db68132df123"`);
        await queryRunner.query(`ALTER TABLE "code_counters" DROP COLUMN "tenant_id"`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD "tableName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD CONSTRAINT "PK_ea7e720be5360d6d138a2889361" PRIMARY KEY ("tableName")`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD "lastValue" bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD "tenantId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "code_counters" DROP CONSTRAINT "PK_ea7e720be5360d6d138a2889361"`);
        await queryRunner.query(`ALTER TABLE "code_counters" ADD CONSTRAINT "PK_63efee027abb6470be01a6b42bc" PRIMARY KEY ("tenantId", "tableName")`);
    }

}
