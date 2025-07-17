import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccountService } from 'src/account/account.service';
import { Account } from 'src/account/entity/account.entity';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { generateRedisKeyFromAccountToEntity } from 'src/common/utils';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { FormulationService } from 'src/formulation/formulation.service';
import { InventoryService } from 'src/inventory/inventory.service';
import { RedisService } from 'src/redis/redis.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { QueryRunner, Repository } from 'typeorm';
import { CreateProductionDto } from './dto/create-production.dto';
import { Production } from './entity/production.entity';

@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(Production)
    private productionRepository: Repository<Production>,
    private formulationService: FormulationService,
    private readonly inventoryService: InventoryService,
    private readonly accountService: AccountService,
    private readonly redisService: RedisService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async create(
    createProductionDto: CreateProductionDto,
    queryRunner: QueryRunner,
  ): Promise<Production> {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant not found');
    }

    const formulation = await this.formulationService.findOne(
      createProductionDto.formulationId,
    );
    if (!formulation)
      throw new NotFoundException(
        `Formulation with ID ${createProductionDto.formulationId} not found`,
      );

    let workInProgressAmount = 0;

    const inventoryPromises: Promise<any>[] = [];
    const creditPromises: Promise<any>[] = [];

    for (const ingredient of formulation.ingredients) {
      // Inventory decrement
      inventoryPromises.push(
        this.inventoryService.incrementBalance(
          String(ingredient.inventory_item_id),
          -ingredient.quantityRequired,
          'quantity',
          queryRunner,
        ),
      );

      // Resolve inventory account from Redis or DB
      const key = generateRedisKeyFromAccountToEntity(
        String(ingredient.inventory_item_id),
        EntityType.INVENTORY,
        tenantId,
        true,
      );

      const inventoryAccountPromise = (async () => {
        let inventoryAccount = await this.redisService.getHash<Account>(key);
        if (!inventoryAccount) {
          const accounts = await this.accountService.findByEntityIdAndType(
            String(ingredient.inventory_item_id),
            EntityType.INVENTORY,
          );
          if (!accounts?.length) {
            throw new NotFoundException(
              `Accounts not found for inventory with ID ${ingredient.inventory_item_id}`,
            );
          }
          inventoryAccount = accounts.find(
            (account) => !account.pathName.includes('Reserves'),
          )!;
          await this.redisService.setHash(key, inventoryAccount);
        }

        // Credit account
        creditPromises.push(
          this.accountService.credit(
            String(inventoryAccount.id),
            ingredient.amount,
            queryRunner,
          ),
        );

        workInProgressAmount += ingredient.amount;
      })();

      // Push this account resolver promise too, to wait later
      inventoryPromises.push(inventoryAccountPromise);
    }

    // Run all inventory updates and Redis/DB resolutions + credits in parallel
    await Promise.all(inventoryPromises);
    await Promise.all(creditPromises);

    // Debit WIP after credits
    const wipAccount = await this.accountService.findOne(
      { name: 'Work In Progress' },
      ['id'],
    );
    if (!wipAccount) {
      throw new NotFoundException('Work In Progress account not found');
    }
    await this.accountService.debit(
      wipAccount.id,
      workInProgressAmount,
      queryRunner,
    );

    // Save production
    return await this.productionRepository.save({
      ...createProductionDto,
      formulation: { id: createProductionDto.formulationId },
      status: 'In Progress',
      tenant: { id: tenantId },
    });
  }

  async changeStatus(
    id: string,
    queryRunner: QueryRunner,
  ): Promise<Production> {
    const tenantId = this.tenantContextService.getTenantId()!;
    // Fetch production with formulation
    const production = await this.productionRepository.findOne({
      where: { id },
      relations: ['formulation'],
    });
    if (!production)
      throw new NotFoundException(`Production with ID ${id} not found`);
    await this.handleProductionCompletionAccounting(
      production,
      tenantId,
      queryRunner,
    );
    return await this.productionRepository.save({ id, status: 'Completed' });
  }

  /**
   * Handles accounting entries when production is completed:
   * - Debits product inventory accounts by their share of total cost
   * - Credits WIP account by the same total
   */
  private async handleProductionCompletionAccounting(
    production: Production,
    tenantId: string,
    queryRunner: QueryRunner,
  ) {
    const { formulation } = production;
    let totalProductAmount = 0;
    const inventoryPromises: Promise<any>[] = [];
    const accountPromises: Promise<any>[] = [];

    for (const product of formulation.products) {
      const amount =
        Number(formulation.totalCost) * Number(product.costFiPercent);
      totalProductAmount += amount;
      // Resolve inventory account from Redis or DB
      const key = generateRedisKeyFromAccountToEntity(
        String(product.product_id),
        EntityType.INVENTORY,
        tenantId,
        true,
      );
      let inventoryAccount = await this.redisService.getHash<Account>(key);
      if (!inventoryAccount) {
        const accounts = await this.accountService.findByEntityIdAndType(
          String(product.product_id),
          EntityType.INVENTORY,
        );
        if (!accounts?.length) {
          throw new NotFoundException(
            `Accounts not found for inventory with ID ${product.product_id}`,
          );
        }
        inventoryAccount = accounts.find(
          (account) => !account.pathName.includes('Reserves'),
        )!;
        await this.redisService.setHash(key, inventoryAccount);
      }

      inventoryPromises.push(
        this.inventoryService.incrementBalance(
          String(product.product_id),
          -product.quantityRequired,
          'quantity',
          queryRunner,
        ),
      );

      accountPromises.push(
        this.accountService.debit(
          String(inventoryAccount.id),
          amount,
          queryRunner,
        ),
      );
    }
    // Credit WIP account by total

    const wipAccount = await this.accountService.findOne(
      { name: 'Work In Progress' },
      ['id'],
    );
    if (!wipAccount) {
      throw new NotFoundException('Work In Progress account not found');
    }
    accountPromises.push(
      this.accountService.credit(
        wipAccount.id,
        totalProductAmount,
        queryRunner,
      ),
    );

    for (const expense of formulation.expenses) {
      const amount = Number(expense.amount);
      accountPromises.push(
        this.accountService.credit(
          String(expense.expense_account_id),
          amount,
          queryRunner,
        ),
      );
    }

    await Promise.all(inventoryPromises);
    await Promise.all(accountPromises);
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<Production>> {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant not found');
    }
    const queryBuilder = this.productionRepository
      .createQueryBuilder('production')
      .leftJoinAndSelect('production.formulation', 'formulation')
      .leftJoinAndSelect('production.tenant', 'tenant')
      .where('tenant.id = :tenantId', { tenantId });

    const { page, limit } = filters;
    const paginated = paginate(queryBuilder, page, limit);
    return paginated;
  }

  async findOne(id: string): Promise<Production> {
    const production = await this.productionRepository.findOne({
      where: { id },
    });
    if (!production)
      throw new NotFoundException(`Production with ID ${id} not found`);
    return production;
  }
}
