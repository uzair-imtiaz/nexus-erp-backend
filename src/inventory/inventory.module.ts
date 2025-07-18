import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from 'src/account/account.module';
import { TenantModule } from 'src/tenant/tenant.module';
import { Inventory } from './entity/inventory.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { AuthModule } from 'src/auth/auth.module';
import { JournalModule } from 'src/journal/journal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory]),
    AccountModule,
    TenantModule,
    AuthModule,
    forwardRef(() => JournalModule),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
