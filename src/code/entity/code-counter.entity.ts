import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('code_counters')
export class CodeCounter {
  @PrimaryColumn('uuid', { name: 'tenant_id' })
  tenantId: string;

  @PrimaryColumn({ name: 'table_name' })
  tableName: string;

  @Column({ type: 'bigint', default: 0, name: 'last_value' })
  lastValue: number;
}
