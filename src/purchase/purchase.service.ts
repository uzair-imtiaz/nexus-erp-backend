import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import * as dayjs from 'dayjs';
import { AccountService } from 'src/account/account.service';
import { Account } from 'src/account/entity/account.entity';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { LocalFileService } from 'src/common/services/local-file.service';
import { PdfService } from 'src/common/services/pdf.service';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { InventoryService } from 'src/inventory/inventory.service';
import {
  CreateJournalDto,
  JournalDetailDto,
} from 'src/journal/dto/create-journal.dto';
import { JournalService } from 'src/journal/journal.service';
import { RedisService } from 'src/redis/redis.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
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
    private readonly inventoryService: InventoryService,
    private readonly redisService: RedisService,
    private readonly journalService: JournalService,
    private readonly fileService: LocalFileService,
    private readonly pdfService: PdfService,
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
    const journalDetails: JournalDetailDto[] = [];

    let totalAmount = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    const inventories: PurchaseInventory[] = [];
    // const accountUpdates: Promise<any>[] = [];

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

      await this.handleInventoryUpdate(
        item,
        amount,
        type,
        journalDetails,
        queryRunner,
      );

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
      journalDetails,
      queryRunner,
    );

    await this.addTaxAndDiscountTransactions(
      journalDetails,
      totalTax,
      totalDiscount,
      type,
    );

    // await Promise.all(accountUpdates);
    const createJournalDto: CreateJournalDto = {
      ref: dto.ref || `Purchase ${savedTransaction.id}`,
      date: dto.date,
      details: journalDetails,
    };
    const journal = await this.journalService.create(
      createJournalDto,
      queryRunner,
    );

    const savedJournal = await queryRunner.manager.save(journal);
    await queryRunner.manager.save(PurchaseInventory, inventories);

    savedTransaction.totalAmount = totalAmount;
    savedTransaction.outstandingBalance = totalAmount;
    savedTransaction.journal = savedJournal;
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
    journalDetails: JournalDetailDto[],
    queryRunner: QueryRunner,
  ) {
    const tenantId = this.tenantContextService.getTenantId()!;

    let account = await this.redisService.getHash<Account>(
      `accountByEntity:${tenantId}:${EntityType.VENDOR}:${id}:regular`,
    );

    if (!account) {
      const accounts = await this.accountService.findByEntityIdAndType(
        id,
        EntityType.VENDOR,
      );
      if (!accounts?.length) {
        throw new NotFoundException(
          `Accounts not found for vendor with ID ${id}`,
        );
      }
      account = accounts.find((a) => a.code.endsWith('-cr'))!;
      await this.redisService.setHash(
        `accountByEntity:${tenantId}:${EntityType.VENDOR}:${id}:regular`,
        account,
      );
    }
    journalDetails.push({
      nominalAccountId: account.id,
      credit: type === 'PURCHASE' ? amount : 0,
      debit: type === 'PURCHASE' ? 0 : amount,
      description: `Purchase from ${account.name}`,
    });
  }

  private async handleInventoryUpdate(
    item: InventoryDto,
    amount: number,
    type: 'PURCHASE' | 'RETURN',
    journalDetails: JournalDetailDto[],
    queryRunner: QueryRunner,
  ) {
    const tenantId = this.tenantContextService.getTenantId()!;
    const quantityChange = type === 'PURCHASE' ? item.quantity : -item.quantity;
    const amountChange = type === 'PURCHASE' ? amount : -amount;

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

    const inventory = await this.inventoryService.findOne(item.id);
    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    const newQuantity = inventory.quantity + quantityChange;
    const newAmount = inventory.amount + amountChange;

    if (newQuantity === 0) {
      throw new BadRequestException('Inventory quantity cannot be zero');
    }
    await this.inventoryService.update(
      item.id,
      {
        quantity: newQuantity,
        amount: newAmount,
        baseRate: newAmount / newQuantity,
      },
      queryRunner,
      false,
    );

    journalDetails.push({
      nominalAccountId: invAccount.id,
      debit: type === 'PURCHASE' ? amount : 0,
      credit: type === 'RETURN' ? amount : 0,
      description: `Inventory ${type} - Item ID: ${item.id}, Amount: ${amount}`,
    });
  }

  private async addTaxAndDiscountTransactions(
    journalDetails: JournalDetailDto[],
    totalTax: number,
    totalDiscount: number,
    type: 'PURCHASE' | 'RETURN',
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

      journalDetails.push({
        nominalAccountId: account.id,
        debit: type === 'PURCHASE' ? totalTax : 0,
        credit: type === 'RETURN' ? totalTax : 0,
      });
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

      journalDetails.push({
        nominalAccountId: account.id,
        credit: type === 'PURCHASE' ? totalDiscount : 0,
        debit: type === 'RETURN' ? totalDiscount : 0,
      });
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

  async updateOutstandingBalance(id: string, amount: number) {
    await this.purchaseRepository.update(id, {
      outstandingBalance: () => `"outstanding_balance" - ${amount}`,
    });
  }

  async generateBill(purchaseId: string): Promise<string> {
    const purchase = await this.purchaseRepository.findOne({
      where: { id: purchaseId },
      relations: ['vendor', 'inventories', 'tenant'],
    });

    if (!purchase) throw new NotFoundException('Purchase not found');

    if (await this.fileService.exists(`bill-${purchase.id}.pdf`)) {
      return `bill-${purchase.id}.pdf`;
    }

    const totals = purchase.inventories.reduce(
      (acc, curr) => ({
        tax: acc.tax + (curr.tax ?? 0),
        discount: acc.discount + (curr.discount ?? 0),
      }),

      { tax: 0, discount: 0 },
    );

    const html = await this.pdfService.renderTemplate('template', {
      ...purchase,
      type: 'Bill',
      transactor: purchase.vendor,
      totalTax: totals.tax,
      totalDiscount: totals.discount,
      formattedDate: dayjs(purchase.date).format('DD-MM-YYYY'),
    });

    const buffer = await this.pdfService.htmlToPdf(html);
    const fileName = `bill-${purchase.id}.pdf`;

    await this.fileService.save(fileName, buffer);
    return fileName;
  }

  async getBillFile(fileName: string) {
    if (!(await this.fileService.exists(fileName))) {
      throw new NotFoundException('Bill not found');
    }
    return this.fileService.getFilePath(fileName);
  }
}
