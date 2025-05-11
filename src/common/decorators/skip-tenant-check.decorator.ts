import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_GUARD = 'skipTenantGuard';

export const SkipTenant = () => SetMetadata(SKIP_TENANT_GUARD, true);
