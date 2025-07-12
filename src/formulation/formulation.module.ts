import { Module } from '@nestjs/common';
import { FormulationService } from './formulation.service';
import { FormulationController } from './formulation.controller';
import { TenantModule } from 'src/tenant/tenant.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formulation } from './entity/formulation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Formulation]), TenantModule],
  controllers: [FormulationController],
  providers: [FormulationService],
  exports: [FormulationService],
})
export class FormulationModule {}
