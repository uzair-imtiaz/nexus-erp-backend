import { Global, Module, Scope } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entity/tenant.entity';
import { TenantService } from './tenant.service';
import { TenantContextService } from './tenant-context.service';
import { TenantGuard } from './guards/tenant.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [
    TenantService,
    TenantGuard,
    {
      provide: TenantContextService,
      useClass: TenantContextService,
      scope: Scope.REQUEST,
    },
  ],
  exports: [TenantService, TenantContextService, TenantGuard],
})
export class TenantModule {}
