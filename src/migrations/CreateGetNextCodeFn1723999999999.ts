import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGetNextCodeFn1723999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION get_next_code(p_tenant UUID, p_table TEXT)
            RETURNS BIGINT AS $$
            DECLARE
                new_val BIGINT;
            BEGIN
                INSERT INTO code_counters (tenant_id, table_name, last_value)
                VALUES (p_tenant, p_table, 0)
                ON CONFLICT (tenant_id, table_name) DO NOTHING;

                UPDATE code_counters
                SET last_value = last_value + 1
                WHERE tenant_id = p_tenant AND table_name = p_table
                RETURNING last_value INTO new_val;

                RETURN new_val;
            END;
            $$ LANGUAGE plpgsql;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS get_next_code(UUID, TEXT);`,
    );
  }
}
