import { Injectable, BadRequestException } from '@nestjs/common';
import * as csvParser from 'csv-parser';
import { InventoryService } from 'src/inventory/inventory.service';
import { Readable } from 'stream';
import { Inventory } from 'src/inventory/entity/inventory.entity';
import { CreateInventoryDto } from 'src/inventory/dto/create-inventory.dto';

@Injectable()
export class InventoryBulkHandler {
  constructor(private readonly inventoryService: InventoryService) {}

  async importFile(file: { buffer: Buffer }) {
    const rows = (await this.parseCsv(file.buffer)) as CreateInventoryDto[];

    const created: Inventory[] = [];
    for (const row of rows) {
      // const validated = this.validateRow(row);
      created.push(await this.inventoryService.create(row));
    }

    return {
      imported: created.length,
      items: created,
    };
  }

  private async parseCsv(buffer: Buffer): Promise<CreateInventoryDto[]> {
    return new Promise((resolve, reject) => {
      const rows: CreateInventoryDto[] = [];
      const stream = Readable.from(buffer).pipe(csvParser());

      stream.on('data', (data) => rows.push(data));
      stream.on('end', () => resolve(rows));
      stream.on('error', (err) => reject(err));
    });
  }

  private validateRow(row: Record<string, string>) {
    const required = ['name', 'code', 'quantity', 'baseRate', 'amount'];
    for (const field of required) {
      if (!row[field] || row[field].trim() === '') {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }

    return {
      name: row['name'].trim(),
      code: row['code'].trim(),
      quantity: parseInt(row['quantity']),
      baseRate: parseFloat(row['baseRate']),
      category: row['category']?.trim() || null,
      baseUnit: row['baseUnit']?.trim() || null,
      amount: parseFloat(row['amount']),
      parentId: row['parentId']?.trim() || null,
      multiUnits: row['multiUnits'] ? this.parseJson(row['multiUnits']) : null,
    };
  }

  private parseJson(value: string) {
    try {
      return JSON.parse(value);
    } catch (e) {
      throw new BadRequestException('Invalid JSON in multiUnits column.');
    }
  }
}
