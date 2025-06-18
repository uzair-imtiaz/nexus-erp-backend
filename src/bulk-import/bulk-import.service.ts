import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryBulkHandler } from './handlers/inventory-bulk.handler';
import { BulkHandler } from './interfaces/handler.interface';

@Injectable()
export class BulkImportService {
  private handlers: Record<string, BulkHandler>;

  constructor(private readonly inventoryBulkHandler: InventoryBulkHandler) {
    this.handlers = {
      inventory: this.inventoryBulkHandler,
    };
  }

  async importBulkData(entity: string, file: Express.Multer.File) {
    const handler = this.handlers[entity];
    if (!handler) {
      throw new BadRequestException(`Unsupported entity: ${entity}`);
    }
    return await handler.importFile(file);
  }
}
