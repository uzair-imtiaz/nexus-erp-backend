import { Module } from '@nestjs/common';
import { SubcategoriesService } from './subcategories.service';
import { SubcategoriesController } from './subcategories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entity/account-base.entity';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account]), TenantModule],
  controllers: [SubcategoriesController],
  providers: [SubcategoriesService],
})
export class SubcategoriesModule {}
