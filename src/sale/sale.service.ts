import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { AccountService } from 'src/account/account.service';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { CustomerService } from 'src/customer/customer.service';
import { Customer } from 'src/customer/entity/customer.entity';
import { Inventory } from 'src/inventory/entity/inventory.entity';
import { InventoryService } from 'src/inventory/inventory.service';
import { RedisService } from 'src/redis/redis.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { QueryRunner, Repository } from 'typeorm';
import { ACCOUNT_IDS } from './constants/sale.constants';
import { CreateSaleDto, InventoryDto } from './dto/create-sale.dto';
import { SaleInventory } from './entity/sale-inventory.entity';
import { Sale } from './entity/sale.entity';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Injectable()
export class SaleService {
  constructor(
    @InjectRepository(Sale) private saleRepository: Repository<Sale>,
    @InjectRepository(SaleInventory)
    private saleInventoryRepository: Repository<SaleInventory>,
    private readonly tenantContextService: TenantContextService,
    private readonly customerService: CustomerService,
    private readonly inventoryService: InventoryService,
    private readonly accountService: AccountService,
    private readonly redisService: RedisService,
  ) {}
  // Public API
  async createSale(
    dto: CreateSaleDto,
    queryRunner: QueryRunner,
  ): Promise<Sale> {
    return this.createTransactionInternal(dto, 'SALE', queryRunner);
  }

  async createReturn(
    dto: CreateSaleDto,
    queryRunner: QueryRunner,
  ): Promise<Sale> {
    return this.createTransactionInternal(dto, 'RETURN', queryRunner);
  }

  private async createTransactionInternal(
    dto: CreateSaleDto,
    type: 'SALE' | 'RETURN',
    queryRunner: QueryRunner,
  ): Promise<Sale> {
    const tenantId = this.tenantContextService.getTenantId()!;

    let totalAmount = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const inventories: SaleInventory[] = [];
    const accountUpdates: Promise<any>[] = [];

    const saleToSave = this.saleRepository.create({
      tenant: { id: tenantId },
      notes: dto.notes,
      customer: { id: dto.customerId },
      ref: dto.ref,
      date: dto.date,
      totalAmount: 0,
      type,
    });
    const savedTransaction = await queryRunner.manager.save(saleToSave);

    for (const item of dto.items) {
      const { amount, tax, discount } = this.calculateItemTotals(item);
      totalAmount += amount;
      totalTax += tax;
      totalDiscount += discount;

      await this.handleInventoryUpdate(item, amount, type, queryRunner);

      inventories.push(
        this.saleInventoryRepository.create({
          sale: savedTransaction,
          inventory: { id: item.id },
          quantity: item.quantity,
          rate: item.rate,
          discount: discount,
          tax: tax,
          unit: item.unit,
          tenant: { id: tenantId },
        }),
      );
    }

    accountUpdates.push(
      this.accountService.update(
        String(ACCOUNT_IDS.COST),
        {
          ...(type === 'SALE'
            ? { debitAmount: totalAmount }
            : { creditAmount: totalAmount }),
        },
        queryRunner,
        true,
      ),
    );

    const netAmount = totalAmount + totalTax - totalDiscount;
    await this.updateCustomerBalance(
      dto.customerId,
      netAmount,
      type,
      accountUpdates,
      queryRunner,
    );

    this.addTaxAndDiscountTransactions(
      accountUpdates,
      totalTax,
      totalDiscount,
      type,
      queryRunner,
    );

    accountUpdates.push(
      this.accountService.update(
        String(ACCOUNT_IDS.SALE),
        {
          ...(type === 'SALE'
            ? { creditAmount: totalAmount }
            : { debitAmount: totalAmount }),
        },
        queryRunner,
        true,
      ),
    );
    await Promise.all(accountUpdates);

    await queryRunner.manager.save(SaleInventory, inventories);

    savedTransaction.totalAmount = totalAmount;
    await queryRunner.manager.save(savedTransaction);
    return savedTransaction;
  }

  private calculateItemTotals(item: InventoryDto) {
    return {
      amount: item.rate * item.quantity,
      tax: item.tax ?? 0,
      discount: item.discount ?? 0,
    };
  }

  private async updateCustomerBalance(
    id: string,
    amount: number,
    type: 'SALE' | 'RETURN',
    accountUpdates: Promise<any>[] = [],
    queryRunner: QueryRunner,
  ) {
    const tenantId = this.tenantContextService.getTenantId()!;
    await this.customerService.incrementBalance(
      id,
      type === 'SALE' ? amount : -amount,
      'openingBalance',
    );

    const account = await this.redisService.getHash<Customer>(
      `accountByEntity:${tenantId}:${EntityType.CUSTOMER}:${id}:regular`,
    );

    if (!account) {
      throw new NotFoundException('Customer account not found');
    }

    accountUpdates.push(
      this.accountService.update(
        account.id,
        {
          ...(type === 'SALE'
            ? { debitAmount: amount }
            : { creditAmount: amount }),
        },
        queryRunner,
        true,
      ),
    );
  }

  private async handleInventoryUpdate(
    item: InventoryDto,
    amount: number,
    type: 'SALE' | 'RETURN',
    queryRunner: QueryRunner,
    accountUpdates: Promise<any>[] = [],
  ) {
    const tenantId = this.tenantContextService.getTenantId()!;
    const quantityChange = type === 'SALE' ? -item.quantity : item.quantity;
    const amountChange = type === 'SALE' ? -amount : amount;

    const invAccount = await this.redisService.getHash<Inventory>(
      `accountByEntity:${tenantId}:${EntityType.INVENTORY}:${item.id}:regular`,
    );

    if (!invAccount) {
      throw new NotFoundException('Inventory account not found');
    }

    accountUpdates.push(
      this.accountService.update(
        invAccount.id,
        {
          ...(type === 'SALE'
            ? { creditAmount: amount }
            : { debitAmount: amount }),
        },
        queryRunner,
        true,
      ),
    );

    await Promise.all([
      this.inventoryService.incrementBalance(
        item.id,
        quantityChange,
        'quantity',
        queryRunner,
      ),
      this.inventoryService.incrementBalance(
        item.id,
        amountChange,
        'amount',
        queryRunner,
      ),
    ]);
  }

  private addTaxAndDiscountTransactions(
    accountUpdates: Promise<any>[],
    totalTax: number,
    totalDiscount: number,
    type: 'SALE' | 'RETURN',
    queryRunner: QueryRunner,
  ) {
    if (totalTax) {
      accountUpdates.push(
        this.accountService.update(
          String(ACCOUNT_IDS.GST),
          {
            ...(type === 'SALE'
              ? { creditAmount: totalTax }
              : { debitAmount: totalTax }),
          },
          queryRunner,
          true,
        ),
      );
    }
    if (totalDiscount) {
      accountUpdates.push(
        this.accountService.update(
          String(ACCOUNT_IDS.DISCOUNT),
          {
            ...(type === 'SALE'
              ? { debitAmount: totalDiscount }
              : { creditAmount: totalDiscount }),
          },
          queryRunner,
          true,
        ),
      );
    }
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<Sale>> {
    const tenantId = this.tenantContextService.getTenantId();
    const queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.inventories', 'inventories')
      .leftJoinAndSelect('sale.customer', 'customer')
      .where('sale.tenant.id = :tenantId', { tenantId });

    const { page, limit } = filters;

    const paginated = await paginate(queryBuilder, page, limit);
    paginated.data = paginated.data.map((item) => {
      const instance = plainToInstance(Sale, item);
      return instance;
    });
    return paginated;
  }

  async remove(id: string): Promise<void> {
    await this.saleRepository.delete(id);
  }

  async findOne(id: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: ['inventories', 'customer'],
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }

  private async reverseSaleEffects(
    sale: Sale,
    queryRunner: QueryRunner,
  ): Promise<void> {
    // 1. Reverse inventory and account updates
    for (const item of sale.inventories) {
      const reverseItem: InventoryDto = {
        id: item.inventory.id,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        tax: item.tax,
        unit: item.unit,
      };
      await this.handleInventoryUpdate(
        reverseItem,
        item.rate * item.quantity,
        sale.type === 'SALE' ? 'RETURN' : 'SALE',
        queryRunner,
      );
    }

    // 2. Reverse customer balance and account updates
    const totalAmount = sale.totalAmount;
    const totalTax = sale.inventories.reduce((sum, i) => sum + (i.tax ?? 0), 0);
    const totalDiscount = sale.inventories.reduce(
      (sum, i) => sum + (i.discount ?? 0),
      0,
    );
    const netAmount = totalAmount + totalTax - totalDiscount;
    const accountUpdates: Promise<any>[] = [];
    await this.updateCustomerBalance(
      sale.customer.id,
      netAmount,
      sale.type === 'SALE' ? 'RETURN' : 'SALE',
      accountUpdates,
      queryRunner,
    );
    this.addTaxAndDiscountTransactions(
      accountUpdates,
      totalTax,
      totalDiscount,
      sale.type === 'SALE' ? 'RETURN' : 'SALE',
      queryRunner,
    );
    await Promise.all(accountUpdates);
  }

  async update(
    saleId: string,
    dto: UpdateSaleDto,
    queryRunner: QueryRunner,
  ): Promise<Sale> {
    const tenantId = this.tenantContextService.getTenantId()!;

    // Fetch the existing sale and its inventories
    const existingSale = await this.saleRepository.findOne({
      where: { id: saleId, tenant: { id: tenantId } },
      relations: ['inventories', 'customer'],
    });
    if (!existingSale) {
      throw new NotFoundException('Sale not found');
    }

    // Reverse the effects of the old sale
    await this.reverseSaleEffects(existingSale, queryRunner);
    // 3. Remove old inventories
    await queryRunner.manager.delete(SaleInventory, { sale: { id: saleId } });

    // Apply the new sale data (similar to createSale)
    let totalAmount = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const inventories: SaleInventory[] = [];
    const accountUpdates: Promise<any>[] = [];

    existingSale.notes = dto.notes;
    existingSale.customer = { id: dto.customerId } as Customer;
    existingSale.ref = dto.ref;
    if (dto.date) existingSale.date = dto.date;

    if (dto.items) {
      for (const item of dto.items) {
        const { amount, tax, discount } = this.calculateItemTotals(item);
        totalAmount += amount;
        totalTax += tax;
        totalDiscount += discount;

        await this.handleInventoryUpdate(item, amount, 'SALE', queryRunner);

        inventories.push(
          this.saleInventoryRepository.create({
            sale: existingSale,
            inventory: { id: item.id },
            quantity: item.quantity,
            rate: item.rate,
            discount: discount,
            tax: tax,
            unit: item.unit,
            tenant: { id: tenantId },
          }),
        );
      }
    }

    accountUpdates.push(
      this.accountService.update(
        String(ACCOUNT_IDS.COST),
        { debitAmount: totalAmount },
        queryRunner,
        true,
      ),
    );

    const netAmount = totalAmount + totalTax - totalDiscount;
    await this.updateCustomerBalance(
      dto.customerId!,
      netAmount,
      'SALE',
      accountUpdates,
      queryRunner,
    );

    this.addTaxAndDiscountTransactions(
      accountUpdates,
      totalTax,
      totalDiscount,
      'SALE',
      queryRunner,
    );

    accountUpdates.push(
      this.accountService.update(
        String(ACCOUNT_IDS.SALE),
        { creditAmount: totalAmount },
        queryRunner,
        true,
      ),
    );
    await Promise.all(accountUpdates);

    await queryRunner.manager.save(SaleInventory, inventories);

    existingSale.totalAmount = totalAmount;
    await queryRunner.manager.save(existingSale);
    return existingSale;
  }

  async delete(id: string, queryRunner: QueryRunner): Promise<void> {
    const tenantId = this.tenantContextService.getTenantId();
    // Fetch the sale and its inventories
    const sale = await this.saleRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['inventories', 'customer'],
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    // Reverse all effects
    await this.reverseSaleEffects(sale, queryRunner);

    // Delete SaleInventory and Sale
    await queryRunner.manager.delete(SaleInventory, { sale: { id } });
    await queryRunner.manager.delete(Sale, { id });
  }
}
