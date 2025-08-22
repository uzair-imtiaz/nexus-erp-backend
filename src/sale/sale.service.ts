import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import * as dayjs from 'dayjs';
import { AccountService } from 'src/account/account.service';
import { Account } from 'src/account/entity/account.entity';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { LocalFileService } from 'src/common/services/local-file.service';
import { PdfService } from 'src/common/services/pdf.service';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { CustomerService } from 'src/customer/customer.service';
import { Customer } from 'src/customer/entity/customer.entity';
import { InventoryService } from 'src/inventory/inventory.service';
import {
  CreateJournalDto,
  JournalDetailDto,
} from 'src/journal/dto/create-journal.dto';
import { JournalService } from 'src/journal/journal.service';
import { RedisService } from 'src/redis/redis.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { QueryRunner, Repository } from 'typeorm';
import { CreateSaleDto, InventoryDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SaleInventory } from './entity/sale-inventory.entity';
import { Sale } from './entity/sale.entity';

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
    private readonly journalService: JournalService,
    private readonly pdfService: PdfService,
    private readonly fileService: LocalFileService,
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

  // Helper to batch fetch required accounts by name
  private async getRequiredAccounts(): Promise<{
    costAccount: { id: string };
    salesAccount: { id: string };
    gstAccount: { id: string };
    discountAccount: { id: string };
  }> {
    const accountNames = [
      'Cost of Sales',
      'Sales of Product Income',
      'General Sales Tax',
      'Discount on Invoice',
    ];
    const accounts = await Promise.all(
      accountNames.map(
        (name) =>
          this.accountService.findOne({ name }, ['id']) as Promise<{
            id: string;
          } | null>,
      ),
    );
    if (!Array.isArray(accounts) || accounts.length !== 4) {
      throw new NotFoundException('One or more required accounts not found');
    }
    const [costAccount, salesAccount, gstAccount, discountAccount] = accounts;
    if (!costAccount)
      throw new NotFoundException('Cost of Goods Sold account not found');
    if (!salesAccount) throw new NotFoundException('Sales account not found');
    if (!gstAccount)
      throw new NotFoundException('General Sales Tax account not found');
    if (!discountAccount)
      throw new NotFoundException('Discount on Sale account not found');
    return { costAccount, salesAccount, gstAccount, discountAccount };
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
    let totalCostAmount = 0;
    const inventories: SaleInventory[] = [];
    const journalDetails: JournalDetailDto[] = [];

    // Batch fetch required accounts for this transaction
    const { costAccount, salesAccount, gstAccount, discountAccount } =
      await this.getRequiredAccounts();

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
      const { costAmount, amount, tax, discount } =
        this.calculateItemTotals(item);
      totalAmount += amount;
      totalTax += tax;
      totalDiscount += discount;
      totalCostAmount += costAmount;

      await this.handleInventoryUpdate(
        item,
        costAmount,
        type,
        journalDetails,
        queryRunner,
      );

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

    journalDetails.push({
      nominalAccountId: costAccount.id,
      debit: type === 'SALE' ? totalCostAmount : 0,
      credit: type === 'SALE' ? 0 : totalCostAmount,
      description: `Sale ${savedTransaction.ref ?? savedTransaction.id}`,
    });

    const netAmount = totalAmount + totalTax - totalDiscount;
    await this.updateCustomerBalance(
      dto.customerId,
      netAmount,
      type,
      journalDetails,
    );

    this.addTaxAndDiscountTransactions(
      journalDetails,
      totalTax,
      totalDiscount,
      type,
      gstAccount.id,
      discountAccount.id,
    );

    journalDetails.push({
      nominalAccountId: salesAccount.id,
      credit: type === 'SALE' ? totalAmount : 0,
      debit: type === 'SALE' ? 0 : totalAmount,
      description: `Sale ${savedTransaction.ref ?? savedTransaction.id}`,
    });

    await queryRunner.manager.save(SaleInventory, inventories);

    const journalDto: CreateJournalDto = {
      details: journalDetails,
      ref: savedTransaction.ref ?? savedTransaction.id,
      date: savedTransaction.date,
      description: `Sale ${savedTransaction.ref ?? savedTransaction.id}`,
    };
    const journal = await this.journalService.create(journalDto, queryRunner);
    const customer = await this.customerService.findOne(dto.customerId);

    savedTransaction.journal = journal;
    savedTransaction.totalAmount = totalAmount;
    savedTransaction.outstandingBalance = totalAmount;
    await queryRunner.manager.save(savedTransaction);
    if (customer.advanceBalance > 0)
      await this.handleAdvanceBalance(savedTransaction, customer, queryRunner);
    return savedTransaction;
  }

  private calculateItemTotals(item: InventoryDto) {
    return {
      costAmount: (item.buyingRate ?? item.rate) * item.quantity,
      amount: item.rate * item.quantity,
      tax: item.tax ?? 0,
      discount: item.discount ?? 0,
    };
  }

  private async updateCustomerBalance(
    id: string,
    amount: number,
    type: 'SALE' | 'RETURN',
    journalDetails: JournalDetailDto[],
  ) {
    const tenantId = this.tenantContextService.getTenantId()!;
    await this.customerService.incrementBalance(
      id,
      type === 'SALE' ? amount : -amount,
      'openingBalance',
    );

    let account = await this.redisService.getHash<Account>(
      `accountByEntity:${tenantId}:${EntityType.CUSTOMER}:${id}:regular`,
    );

    if (!account) {
      const accounts = await this.accountService.findByEntityIdAndType(
        id,
        EntityType.CUSTOMER,
      );
      if (!accounts?.length) {
        throw new NotFoundException('Customer account not found');
      }
      account = accounts.find((a) => a.code.endsWith('-cr'))!;
      await this.redisService.setHash(
        `accountByEntity:${tenantId}:${EntityType.CUSTOMER}:${id}:regular`,
        account,
      );
    }

    journalDetails.push({
      nominalAccountId: account.id,
      debit: type === 'SALE' ? amount : 0,
      credit: type === 'SALE' ? 0 : amount,
      description: `Sale ${type}`,
    });
  }

  private async handleInventoryUpdate(
    item: InventoryDto,
    amount: number,
    type: 'SALE' | 'RETURN',
    journalDetails: JournalDetailDto[],
    queryRunner: QueryRunner,
  ) {
    const tenantId = this.tenantContextService.getTenantId()!;
    const quantityChange = type === 'SALE' ? -item.quantity : item.quantity;
    const amountChange = type === 'SALE' ? -amount : amount;

    let invAccount = await this.redisService.getHash<Account>(
      `accountByEntity:${tenantId}:${EntityType.INVENTORY}:${item.id}:regular`,
    );

    if (!invAccount) {
      const accounts = await this.accountService.findByEntityIdAndType(
        item.id,
        EntityType.INVENTORY,
      );
      if (!accounts?.length) {
        throw new NotFoundException(
          `Accounts not found for inventory with ID ${item.id}`,
        );
      }
      invAccount = accounts.find((a) => a.code.endsWith('-dr'))!;
      await this.redisService.setHash(
        `accountByEntity:${tenantId}:${EntityType.INVENTORY}:${item.id}:regular`,
        invAccount,
      );
    }

    journalDetails.push({
      nominalAccountId: invAccount.id,
      credit: type === 'SALE' ? amount : 0,
      debit: type === 'SALE' ? 0 : amount,
      description: `Sale`,
    });

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
    journalDetails: JournalDetailDto[],
    totalTax: number,
    totalDiscount: number,
    type: 'SALE' | 'RETURN',
    gstAccountId?: string,
    discountAccountId?: string,
  ) {
    if (totalTax && gstAccountId) {
      journalDetails.push({
        nominalAccountId: gstAccountId,
        credit: type === 'SALE' ? totalTax : 0,
        debit: type === 'SALE' ? 0 : totalTax,
        description: `Sale ${type}`,
      });
    }

    if (totalDiscount && discountAccountId) {
      journalDetails.push({
        nominalAccountId: discountAccountId,
        debit: type === 'SALE' ? totalDiscount : 0,
        credit: type === 'SALE' ? 0 : totalDiscount,
        description: `Sale ${type}`,
      });
    }
  }

  private async handleAdvanceBalance(
    sale: Sale,
    customer: Customer,
    queryRunner: QueryRunner,
  ) {
    const originalAdvance = customer.advanceBalance;

    const appliedAdvance = Math.min(originalAdvance, sale.totalAmount);

    // Reduce advanceBalance by the amount applied
    customer.advanceBalance = originalAdvance - appliedAdvance;
    await queryRunner.manager.save(customer);

    // Reduce sale's outstanding amount
    sale.totalAmount = sale.totalAmount - appliedAdvance;
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<Sale>> {
    const tenantId = this.tenantContextService.getTenantId();
    const queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.inventories', 'inventories')
      .leftJoinAndSelect('sale.customer', 'customer')
      .where('sale.tenant.id = :tenantId', { tenantId });

    const { page, limit, ...filterFields } = filters;

    const ALLOWED_FILTERS = ['customer.id'];

    Object.entries(filterFields).forEach(([key, value]) => {
      if (value && ALLOWED_FILTERS.includes(key)) {
        queryBuilder.andWhere(`sale.${key} ILIKE :${key}`, {
          [key]: `%${value}%`,
        });
      }
    });

    const paginated = await paginate(queryBuilder, page, limit);
    paginated.data = paginated.data.map((item) => {
      const instance = plainToInstance(Sale, item);
      return instance;
    });
    return paginated;
  }

  async remove(id: string): Promise<void> {
    await this.saleRepository.softDelete(id);
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
    gstAccount: { id: string },
    discountAccount: { id: string },
    queryRunner: QueryRunner,
    journalDetails: JournalDetailDto[],
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
        journalDetails,
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
    await this.updateCustomerBalance(
      sale.customer.id,
      netAmount,
      sale.type === 'SALE' ? 'RETURN' : 'SALE',
      journalDetails,
    );
    this.addTaxAndDiscountTransactions(
      journalDetails,
      totalTax,
      totalDiscount,
      sale.type === 'SALE' ? 'RETURN' : 'SALE',
      gstAccount.id,
      discountAccount.id,
    );
  }

  async update(
    saleId: string,
    dto: UpdateSaleDto,
    queryRunner: QueryRunner,
  ): Promise<Sale> {
    const tenantId = this.tenantContextService.getTenantId()!;
    // Batch fetch required accounts for this transaction
    const { costAccount, salesAccount, gstAccount, discountAccount } =
      await this.getRequiredAccounts();
    const journalDetails: JournalDetailDto[] = [];

    // Fetch the existing sale and its inventories
    const existingSale = await this.saleRepository.findOne({
      where: { id: saleId, tenant: { id: tenantId } },
      relations: ['inventories', 'customer'],
    });
    if (!existingSale) {
      throw new NotFoundException('Sale not found');
    }

    // Reverse the effects of the old sale
    await this.reverseSaleEffects(
      existingSale,
      gstAccount,
      discountAccount,
      queryRunner,
      journalDetails,
    );
    // 3. Remove old inventories
    await queryRunner.manager.softDelete(SaleInventory, {
      sale: { id: saleId },
    });

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

        await this.handleInventoryUpdate(
          item,
          amount,
          'SALE',
          journalDetails,
          queryRunner,
        );

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
        costAccount.id,
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
      journalDetails,
    );

    this.addTaxAndDiscountTransactions(
      journalDetails,
      totalTax,
      totalDiscount,
      'SALE',
      gstAccount.id,
      discountAccount.id,
    );

    journalDetails.push({
      nominalAccountId: salesAccount.id,
      credit: totalAmount,
      debit: 0,
      description: `Sale ${existingSale.ref ?? existingSale.id}`,
    });

    await queryRunner.manager.save(SaleInventory, inventories);

    existingSale.totalAmount = totalAmount;
    const journalDto: CreateJournalDto = {
      details: journalDetails,
      ref: existingSale.ref ?? existingSale.id,
      date: existingSale.date,
      description: `Sale ${existingSale.ref ?? existingSale.id}`,
    };
    const journal = await this.journalService.create(journalDto, queryRunner);
    existingSale.journal = journal;
    await queryRunner.manager.save(existingSale);
    return existingSale;
  }

  async delete(id: string, queryRunner: QueryRunner): Promise<void> {
    const tenantId = this.tenantContextService.getTenantId();
    const { gstAccount, discountAccount } = await this.getRequiredAccounts();
    const journalDetails: JournalDetailDto[] = [];
    // Fetch the sale and its inventories
    const sale = await this.saleRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['inventories', 'customer'],
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    // Reverse all effects
    await this.reverseSaleEffects(
      sale,
      gstAccount,
      discountAccount,
      queryRunner,
      journalDetails,
    );

    const journalDto: CreateJournalDto = {
      details: journalDetails,
      ref: sale.ref ?? sale.id,
      date: sale.date,
      description: `Sale ${sale.ref ?? sale.id} deleting`,
    };
    await this.journalService.create(journalDto, queryRunner);
    await queryRunner.manager.softDelete(Sale, { id });
    await queryRunner.manager.softDelete(SaleInventory, { sale: { id } });
  }

  async updateOutstandingBalance(
    saleId: string,
    amount: number,
  ): Promise<void> {
    await this.saleRepository.update(saleId, {
      outstandingBalance: () => `"outstanding_balance" - ${amount}`,
    });
  }

  async generateInvoice(saleId: string): Promise<string> {
    try {
      const sale = await this.saleRepository.findOne({
        where: { id: saleId },
        relations: ['customer', 'inventories', 'tenant'],
      });

      if (!sale) throw new NotFoundException('Sale not found');

      if (await this.fileService.exists(`invoice-${sale.id}.pdf`)) {
        return `invoice-${sale.id}.pdf`;
      }

      const totals = sale.inventories.reduce(
        (acc, curr) => ({
          tax: acc.tax + (curr.tax ?? 0),
          discount: acc.discount + (curr.discount ?? 0),
        }),

        { tax: 0, discount: 0 },
      );

      const html = await this.pdfService.renderTemplate('template', {
        ...sale,
        transactor: sale.customer,
        type: 'Invoice',
        totalTax: totals.tax,
        totalDiscount: totals.discount,
        formattedDate: dayjs(sale.date).format('DD-MM-YYYY'),
      });

      const buffer = await this.pdfService.htmlToPdf(html);
      const fileName = `invoice-${sale.id}.pdf`;

      await this.fileService.save(fileName, buffer);
      return fileName;
    } catch (error) {
      console.error('Failed to generate invoice', error);
      throw error;
    }
  }

  async getInvoiceFile(fileName: string): Promise<string> {
    if (!(await this.fileService.exists(fileName))) {
      throw new NotFoundException('Invoice not found');
    }
    return this.fileService.getFilePath(fileName);
  }
}
