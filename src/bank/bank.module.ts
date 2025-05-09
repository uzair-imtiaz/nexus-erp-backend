import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { Bank } from './entity/bank.entity';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  imports: [TypeOrmModule.forFeature([Bank]), TenantModule],
  controllers: [BankController],
  providers: [BankService],
})
export class BankModule {}
