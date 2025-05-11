import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_TENANT_GUARD } from 'src/common/decorators/skip-tenant-check.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.get<boolean>(
      SKIP_TENANT_GUARD,
      context.getHandler(),
    );
    if (skip) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];

    if (!tenantId) {
      throw new ForbiddenException('Tenant ID missing from request.');
    }

    return true;
  }
}
