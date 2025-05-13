import { Injectable, NotFoundException } from '@nestjs/common';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { DeepPartial, ObjectLiteral, Repository } from 'typeorm';

@Injectable()
export class GenericService<
  T extends ObjectLiteral,
  CreateDto extends DeepPartial<T>,
  UpdateDto extends DeepPartial<T>
> {
  protected readonly allowedFilters: string[] = ['name'];
  protected readonly entityName: string;

  constructor(
    private repository: Repository<T>,
    private readonly tenantContextService: TenantContextService,
    entityName: string,
  ) {
    this.entityName = entityName.toLowerCase();
  }

  async create(data: CreateDto): Promise<T> {
    const tenantId = this.tenantContextService.getTenantId();
    const entity = this.repository.create({
      ...data,
      tenant: { id: tenantId }
    } as DeepPartial<T>);
    return await this.repository.save(entity);
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<T>> {
    const tenantId = this.tenantContextService.getTenantId();
    const queryBuilder = this.repository
      .createQueryBuilder(this.entityName)
      .where('entity.tenant.id = :tenantId', { tenantId });

    const { page, limit, ...filterFields } = filters;
    const ALLOWED_FILTERS = ['name'];

    Object.entries(filterFields).forEach(([key, value]) => {
      if (value && ALLOWED_FILTERS.includes(key)) {
        queryBuilder.andWhere(`${this.entityName}.${key} ILIKE :${key}`, {
          [key]: `%${value}%`,
        });
      }
    });

    return paginate<T>(queryBuilder, page, limit);
  }

  async findOne(id: string): Promise<T> {
    const tenantId = this.tenantContextService.getTenantId();
    const existingContact = await this.repository.findOne({
      where: { id, tenant: { id: tenantId } } as any,
    });
    if (!existingContact) {
      throw new NotFoundException(`${this.entityName} not found`);
    }
    return existingContact;
  }

  async update(id: string, data: UpdateDto) {
    const existingContact = await this.findOne(id);
    const updated = this.repository.merge(existingContact, data as DeepPartial<T>);
    return await this.repository.save(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    const deleted = await this.repository.delete(id);
    return deleted;
  }
}
