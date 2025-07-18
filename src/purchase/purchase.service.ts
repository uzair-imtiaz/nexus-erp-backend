import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { AccountService } from 'src/account/account.service';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { Customer } from 'src/customer/entity/customer.entity';
import { Inventory } from 'src/inventory/entity/inventory.entity';
import { InventoryService } from 'src/inventory/inventory.service';
import { RedisService } from 'src/redis/redis.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { VendorService } from 'src/vendor/vendor.service';
import { QueryRunner, Repository } from 'typeorm';
import { CreatePurchaseDto, InventoryDto } from './dto/create-purchase.dto';
import { PurchaseInventory } from './entity/purchase-inventory.entity';
import { Purchase } from './entity/purchase.entity';

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(Purchase)
    private purchaseRepository: Repository<Purchase>,
    @InjectRepository(PurchaseInventory)
    private purchaseInventoryRepository: Repository<PurchaseInventory>,
    private readonly accountService: AccountService,
    private readonly tenantContextService: TenantContextService,
    private readonly vendorService: VendorService,
    private readonly inventoryService: InventoryService,
    private readonly redisService: RedisService,
  ) {}

  async createPurchase(
    dto: CreatePurchaseDto,
    queryRunner: QueryRunner,
  ): Promise<Purchase> {
    return this.createTransactionInternal(dto, 'PURCHASE', queryRunner);
  }

  async createReturn(
    dto: CreatePurchaseDto,
    queryRunner: QueryRunner,
  ): Promise<Purchase> {
    return this.createTransactionInternal(dto, 'RETURN', queryRunner);
  }

  private async createTransactionInternal(
    dto: CreatePurchaseDto,
    type: 'PURCHASE' | 'RETURN',
    queryRunner: QueryRunner,
  ): Promise<Purchase> {
    const tenantId = this.tenantContextService.getTenantId()!;

    let totalAmount = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const inventories: PurchaseInventory[] = [];
    const accountUpdates: Promise<any>[] = [];

    const purchaseToSave = this.purchaseRepository.create({
      tenant: { id: tenantId },
      notes: dto.notes,
      vendor: { id: dto.vendorId },
      ref: dto.ref,
      date: dto.date,
      totalAmount: 0,
      type,
    });

    const savedTransaction = await queryRunner.manager.save(purchaseToSave);

    for (const item of dto.items) {
      const { amount, tax, discount } = this.calculateItemTotals(item);
      totalAmount += amount;
      totalTax += tax;
      totalDiscount += discount;

      await this.handleInventoryUpdate(item, amount, type, queryRunner);

      inventories.push(
        this.purchaseInventoryRepository.create({
          purchase: savedTransaction,
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

    const netAmount = totalAmount + totalTax - totalDiscount;
    await this.updateVendorBalance(
      dto.vendorId,
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

    await Promise.all(accountUpdates);

    await queryRunner.manager.save(PurchaseInventory, inventories);

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

  private async updateVendorBalance(
    id: string,
    amount: number,
    type: 'PURCHASE' | 'RETURN',
    accountUpdates: Promise<any>[] = [],
    queryRunner: QueryRunner,
  ) {
    const tenantId = this.tenantContextService.getTenantId()!;
    await this.vendorService.incrementBalance(
      id,
      type === 'PURCHASE' ? -amount : amount,
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
          ...(type === 'PURCHASE'
            ? { creditAmount: amount }
            : { debitAmount: amount }),
        },
        queryRunner,
        true,
      ),
    );
  }

  private async handleInventoryUpdate(
    item: InventoryDto,
    amount: number,
    type: 'PURCHASE' | 'RETURN',
    queryRunner: QueryRunner,
    accountUpdates: Promise<any>[] = [],
  ) {
    const tenantId = this.tenantContextService.getTenantId()!;
    const quantityChange = type === 'PURCHASE' ? item.quantity : -item.quantity;
    const amountChange = type === 'PURCHASE' ? amount : -amount;

    const invAccount = await this.redisService.getHash<Inventory>(
      `accountByEntity:${tenantId}:${EntityType.INVENTORY}:${item.id}:regular`,
    );

    if (!invAccount) {
      throw new NotFoundException('Inventory account not found');
    }

    const inventory = await this.inventoryService.findOne(item.id);
    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    const newQuantity = inventory.quantity + quantityChange;
    const newAmount = inventory.amount + amountChange;

    await this.inventoryService.update(item.id, {
      quantity: newQuantity,
      amount: newAmount,
      baseRate:
        (inventory.quantity * inventory.baseRate + newQuantity * item.rate) /
        (inventory.quantity + newQuantity),
    });
    accountUpdates.push(
      this.accountService.update(
        invAccount.id,
        {
          ...(type === 'PURCHASE'
            ? { debitAmount: amount }
            : { creditAmount: amount }),
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

  private async addTaxAndDiscountTransactions(
    accountUpdates: Promise<any>[],
    totalTax: number,
    totalDiscount: number,
    type: 'PURCHASE' | 'RETURN',
    queryRunner: QueryRunner,
  ) {
    if (totalTax) {
      const account = await this.accountService.findOne(
        {
          name: 'General Sales Tax',
        },
        ['id'],
      );
      if (!account) {
        throw new NotFoundException('General Sales Tax account not found');
      }
      accountUpdates.push(
        this.accountService.update(
          account.id,
          {
            ...(type === 'PURCHASE'
              ? { debitAmount: totalTax }
              : { creditAmount: totalTax }),
          },
          queryRunner,
          true,
        ),
      );
    }
    if (totalDiscount) {
      const account = await this.accountService.findOne(
        {
          name: 'Discount on Purchase',
        },
        ['id'],
      );
      if (!account) {
        throw new NotFoundException('Discount on Purchase account not found');
      }
      accountUpdates.push(
        this.accountService.update(
          account.id,
          {
            ...(type === 'PURCHASE'
              ? { creditAmount: totalDiscount }
              : { debitAmount: totalDiscount }),
          },
          queryRunner,
          true,
        ),
      );
    }
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<Purchase>> {
    const tenantId = this.tenantContextService.getTenantId();
    const queryBuilder = this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.inventories', 'inventories')
      .leftJoinAndSelect('purchase.vendor', 'vendor')
      .where('purchase.tenant.id = :tenantId', { tenantId });

    const { page, limit } = filters;

    const paginated = await paginate(queryBuilder, page, limit);
    paginated.data = paginated.data.map((item) => {
      const instance = plainToInstance(Purchase, item);
      return instance;
    });
    return paginated;
  }
}
