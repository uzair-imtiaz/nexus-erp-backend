import { Injectable, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import * as csvParser from 'csv-parser';
import { Readable } from 'stream';

import { InventoryService } from 'src/inventory/inventory.service';
import { CreateInventoryDto } from 'src/inventory/dto/create-inventory.dto';

import { DataSource } from 'typeorm';
import { Inventory } from 'src/inventory/entity/inventory.entity';

@Injectable()
export class InventoryBulkHandler {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  async importFile(file: Express.Multer.File) {
    const rows = await this.parseCsv(file.buffer);

    // Validate all rows first
    const dtos: CreateInventoryDto[] = [];
    for (const row of rows) {
      dtos.push(this.toValidatedDto(row));
    }

    // Map to entity-like objects
    const entities = dtos.map((dto) => ({
      ...dto,
    }));

    // Use manager to bulk insert in a transaction
    await this.dataSource.manager.transaction(async (manager) => {
      await manager.insert(Inventory, entities);
    });

    return {
      imported: entities.length,
    };
  }

  private async parseCsv(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const rows = [];
      const stream = Readable.from(buffer).pipe(csvParser());

      stream.on('data', (data) => rows.push(data));
      stream.on('end', () => resolve(rows));
      stream.on('error', (err) => reject(err));
    });
  }

  private toValidatedDto(row: Record<string, any>): CreateInventoryDto {
    const plain = {
      ...row,
      quantity: parseInt(row['quantity']),
      baseRate: parseFloat(row['baseRate']),
      multiUnits: row['multiUnits']
        ? this.safeJson(row['multiUnits'])
        : undefined,
    };

    const dto = plainToInstance(CreateInventoryDto, plain, {
      enableImplicitConversion: true,
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private safeJson(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      throw new BadRequestException('Invalid JSON for multiUnits');
    }
  }
}
