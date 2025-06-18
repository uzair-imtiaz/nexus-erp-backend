import { Module } from '@nestjs/common';
import { BulkImportService } from './bulk-import.service';
import { BulkImportController } from './bulk-import.controller';
import { InventoryModule } from 'src/inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [BulkImportController],
  providers: [BulkImportService],
})
export class BulkImportModule {}
