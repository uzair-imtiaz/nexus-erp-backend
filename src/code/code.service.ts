import { Injectable } from '@nestjs/common';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { DataSource } from 'typeorm';

@Injectable()
export class CodeService {
  constructor(
    private dataSource: DataSource,
    private tenantContextService: TenantContextService,
  ) {}

  async getNextCode(tableName: string): Promise<string> {
    const tenantId = this.tenantContextService.getTenantId();
    const result = await this.dataSource.query(
      `SELECT get_next_code($1, $2) AS code`,
      [tenantId, tableName],
    );

    const code = result[0].code;
    const prefix = tableName.substring(0, 3).toUpperCase();

    return `${prefix}-${code}`;
  }
}
