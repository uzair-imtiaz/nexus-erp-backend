import { Module } from '@nestjs/common';
import { ProductionService } from './production.service';
import { ProductionController } from './production.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Production } from './entity/production.entity';
import { TenantModule } from 'src/tenant/tenant.module';
import { FormulationModule } from 'src/formulation/formulation.module';
import { AccountModule } from 'src/account/account.module';
import { RedisModule } from 'src/redis/redis.module';
import { InventoryModule } from 'src/inventory/inventory.module';
import { JournalModule } from 'src/journal/journal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Production]),
    FormulationModule,
    TenantModule,
    AccountModule,
    RedisModule,
    InventoryModule,
    JournalModule,
  ],
  controllers: [ProductionController],
  providers: [ProductionService],
})
export class ProductionModule {}
