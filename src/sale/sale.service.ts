import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { Sale } from './entity/sale.entity';
import { QueryRunner, Repository } from 'typeorm';
import { AccountService } from 'src/account/account.service';
import { CreateSaleDto, InventoryDto } from './dto/create-sale.dto';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { plainToInstance } from 'class-transformer';
import { CustomerService } from 'src/customer/customer.service';
import { UpdateCustomerDto } from 'src/customer/dto/update-customer.dto';
import { InventoryService } from 'src/inventory/inventory.service';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { AccountManagerService } from 'src/common/services/account-manager.service';
import { UpdateAccountDto } from 'src/account/dto/update-account.dto';
import { ACCOUNT_IDS } from './constants/sale.constants';
import { TransactionService } from 'src/common/services/transaction.service';
import { SaleInventory } from './entity/sale-inventory.entity';

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
    private readonly transactionService: TransactionService,
    private readonly accountManagerService: AccountManagerService,
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
    const tenantId = this.tenantContextService.getTenantId();

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
      inventories: dto.items,
    });
    const savedTransaction = await queryRunner.manager.save(saleToSave);

    for (const item of dto.items) {
      const { amount, tax, discount } = this.calculateItemTotals(item);
      totalAmount += amount;
      totalTax += tax;
      totalDiscount += discount;

      await this.handleInventoryUpdate(item, amount, type, queryRunner);

      this.prepareAccountTransaction(
        item,
        amount,
        dto,
        type,
        accountUpdates,
        queryRunner,
      );

      inventories.push(
        this.saleInventoryRepository.create({
          sale: { id: savedTransaction.id },
          inventory: { id: item.id },
          quantity: item.quantity,
          rate: item.rate,
          discount: discount,
          tax: tax,
          tenant: { id: tenantId },
        }),
      );
    }

    // Tax and Discount transactions
    this.addTaxAndDiscountTransactions(
      accountUpdates,
      dto,
      totalTax,
      totalDiscount,
      type,
      queryRunner,
    );

    // Final net amount
    const netAmount = totalAmount + totalTax - totalDiscount;
    await this.updateCustomerBalance(
      dto.customerId,
      netAmount,
      queryRunner,
      accountUpdates,
      type,
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
      ),
    );

    await Promise.all(accountUpdates);
    await queryRunner.manager.save(inventories);

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
    queryRunner: QueryRunner,
    accountUpdates: Promise<any>[],
    type: 'SALE' | 'RETURN',
  ) {
    await this.customerService.incrementBalance(
      id,
      type === 'SALE' ? amount : -amount,
      'openingBalance',
    );

    const account = await this.accountManagerService.getValidAccountByEntityId(
      id,
      EntityType.CUSTOMER,
    );

    accountUpdates.push(
      this.transactionService.postTransaction(
        type === 'SALE' ? String(ACCOUNT_IDS.SALE) : account.id,
        type === 'SALE' ? account.id : String(ACCOUNT_IDS.SALE),
        amount,
        queryRunner,
      ),
    );
  }

  private async handleInventoryUpdate(
    item: InventoryDto,
    amount: number,
    type: 'SALE' | 'RETURN',
    queryRunner: QueryRunner,
  ) {
    const quantityChange = type === 'SALE' ? -item.quantity : item.quantity;
    const amountChange = type === 'SALE' ? -amount : amount;
    await this.inventoryService.incrementBalance(
      item.id,
      quantityChange,
      'quantity',
      queryRunner,
    );
    await this.inventoryService.incrementBalance(
      item.id,
      amountChange,
      'amount',
      queryRunner,
    );
  }

  private async prepareAccountTransaction(
    item: InventoryDto,
    amount: number,
    dto: CreateSaleDto,
    type: 'SALE' | 'RETURN',
    accountUpdates: Promise<any>[],
    queryRunner: QueryRunner,
  ) {
    const inventoryAccount =
      await this.accountManagerService.getValidAccountByEntityId(
        item.id,
        EntityType.INVENTORY,
      );
    const fromAccountId =
      type === 'SALE' ? dto.customerId : inventoryAccount.id;
    const toAccountId = type === 'SALE' ? inventoryAccount.id : dto.customerId;
    accountUpdates.push(
      this.transactionService.postTransaction(
        fromAccountId,
        toAccountId,
        amount,
        queryRunner,
      ),
      this.accountService.update(
        String(ACCOUNT_IDS.COST),
        {
          ...(type === 'SALE'
            ? { debitAmount: amount }
            : { creditAmount: amount }),
        },
        queryRunner,
      ),
    );
  }

  private addTaxAndDiscountTransactions(
    accountUpdates: Promise<any>[],
    dto: CreateSaleDto,
    totalTax: number,
    totalDiscount: number,
    type: 'SALE' | 'RETURN',
    queryRunner: QueryRunner,
  ) {
    if (totalTax) {
      accountUpdates.push(
        this.transactionService.postTransaction(
          type === 'SALE' ? dto.customerId : String(ACCOUNT_IDS.GST),
          type === 'SALE' ? String(ACCOUNT_IDS.GST) : dto.customerId,
          totalTax,
          queryRunner,
        ),
      );
    }
    if (totalDiscount) {
      accountUpdates.push(
        this.transactionService.postTransaction(
          type === 'SALE' ? String(ACCOUNT_IDS.DISCOUNT) : dto.customerId,
          type === 'SALE' ? dto.customerId : String(ACCOUNT_IDS.DISCOUNT),
          totalDiscount,
          queryRunner,
        ),
      );
    }
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<Sale>> {
    const tenantId = this.tenantContextService.getTenantId();
    const queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.inventories', 'inventories')
      .where('sale.tenant.id = :tenantId', { tenantId });

    const { page, limit } = filters;

    const paginated = await paginate(queryBuilder, page, limit);
    paginated.data = paginated.data.map((item) => {
      const instance = plainToInstance(Sale, item);
      return instance;
    });
    return paginated;
  }

  //   async findOne(id: string): Promise<Sale> {
  //     return await this.saleRepository.findOneBy({ id });
  //   }

  async remove(id: string): Promise<void> {
    await this.saleRepository.delete(id);
  }
}
