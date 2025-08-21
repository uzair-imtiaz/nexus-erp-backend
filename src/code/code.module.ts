import { Module } from '@nestjs/common';
import { CodeService } from './code.service';
import { CodeController } from './code.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodeCounter } from './entity/code-counter.entity';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  providers: [CodeService],
  controllers: [CodeController],
  imports: [TypeOrmModule.forFeature([CodeCounter]), TenantModule],
})
export class CodeModule {}
