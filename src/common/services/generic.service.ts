import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { DeepPartial, ObjectLiteral, QueryRunner, Repository } from 'typeorm';

type WithCode = { code: string };

@Injectable()
export class GenericService<
  T extends ObjectLiteral,
  CreateDto extends DeepPartial<T> & Partial<WithCode>,
  UpdateDto extends DeepPartial<T>,
> {
  protected readonly allowedFilters: string[] = ['name'];
  protected readonly entityName: string;

  constructor(
    private repository: Repository<T>,
    protected readonly tenantContextService: TenantContextService,
    entityName: string,
  ) {
    this.entityName = entityName.toLowerCase();
  }

  async create(data: CreateDto, runner?: QueryRunner): Promise<T> {
    const repo = runner
      ? runner.manager.getRepository(this.repository.target)
      : this.repository;
    const tenantId = this.tenantContextService.getTenantId();
    if ('code' in data && data.code) {
      const existing = await this.repository.findOne({
        where: {
          code: data.code,
          tenant: { id: tenantId },
        } as any,
      });

      if (existing) {
        throw new ConflictException(
          `${this.entityName} with code '${data.code}' already exists.`,
        );
      }
    }
    const entity = repo.create({
      ...data,
      tenant: { id: tenantId },
    } as DeepPartial<T>);
    const saved = await repo.save(entity);
    await this.afterCreate(saved, runner);
    return saved;
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<T>> {
    const tenantId = this.tenantContextService.getTenantId();
    const queryBuilder = this.repository
      .createQueryBuilder(this.entityName)
      .where(`${this.entityName}.tenant.id = :tenantId`, { tenantId });

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

  async update(
    id: string,
    data: UpdateDto,
    runner?: QueryRunner,
    accountToUpdate?: 'credit' | 'debit',
  ): Promise<T> {
    const existingContact = await this.findOne(id);
    const updated = this.repository.merge(
      existingContact,
      data as DeepPartial<T>,
    );
    const saved = await this.repository.save(updated);
    await this.afterUpdate(saved, runner, accountToUpdate);
    return saved;
  }

  async remove(id: string, runner?: QueryRunner) {
    const entity = await this.findOne(id);
    if (!entity) {
      throw new NotFoundException(`${this.entityName} not found`);
    }

    const deleted = await this.repository.delete(entity?.id);
    await this.afterDelete(entity, runner);
    return deleted;
  }

  protected async afterCreate(entity: T, runner?: QueryRunner): Promise<void> {}
  protected async afterUpdate(
    entity: T,
    runner?: QueryRunner,
    accountToUpdate?: 'credit' | 'debit',
  ): Promise<void> {}
  protected async afterDelete(entity: T, runner?: QueryRunner): Promise<void> {}
}
