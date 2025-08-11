import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AccountService } from 'src/account/account.service';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { AccountManagerService } from 'src/common/services/account-manager.service';
import { EntityServiceManager } from 'src/common/services/entity-service-manager.service';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { JournalDetailDto } from 'src/journal/dto/create-journal.dto';
import { JournalService } from 'src/journal/journal.service';
import { SaleService } from 'src/sale/sale.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { QueryRunner, Repository } from 'typeorm';
import { CreateReceiptdto } from './dto/create-receipt.dto';
import { Receipt } from './entity/receipt.entity';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt) private receiptRepository: Repository<Receipt>,
    private readonly tenantContextService: TenantContextService,
    private readonly journalService: JournalService,
    private readonly saleService: SaleService,
    private readonly accountManagerService: AccountManagerService,
    private readonly accountService: AccountService,
    private readonly entityServiceManager: EntityServiceManager,
  ) {}

  async create(createReceiptDto: CreateReceiptdto, queryRunner: QueryRunner) {
    const tenantId = this.tenantContextService.getTenantId()!;
    const journalDetails: JournalDetailDto[] = [];

    const discountAccount = await this.accountService.findOne({
      name: 'Discount Allowed',
    });

    if (!discountAccount) {
      throw new NotFoundException('Discount Account not found');
    }

    const salesPromises: Promise<void>[] = [];
    let totalAmount = 0;
    let totalDiscount = 0;

    if (createReceiptDto.transactions) {
      for (const sale of createReceiptDto.transactions) {
        salesPromises.push(
          this.saleService.updateOutstandingBalance(
            sale.id,
            sale.amount + (sale.discount ?? 0),
          ),
        );
        totalAmount += sale.amount;
        if (sale.discount) {
          journalDetails.push({
            description: `Discount on receipt for sale ${sale.id}`,
            nominalAccountId: discountAccount.id,
            credit: 0,
            debit: sale.discount,
          });
          totalDiscount += sale.discount ?? 0;
        }
      }
    }

    const advanceBalance = createReceiptDto.amount - totalAmount;
    const customerAccount =
      await this.accountManagerService.getValidAccountByEntityId(
        createReceiptDto.customerId,
        EntityType.CUSTOMER,
      );

    const bankAccount =
      await this.accountManagerService.getValidAccountByEntityId(
        createReceiptDto.bankId,
        EntityType.BANK,
      );
    if (advanceBalance > 0) {
      this.entityServiceManager.incrementEntityBalance(
        EntityType.CUSTOMER,
        createReceiptDto.customerId,
        advanceBalance,
        queryRunner,
        'openingBalance',
      );
      journalDetails.push({
        description: `Advance balance via receipt ${createReceiptDto.ref}`,
        nominalAccountId: customerAccount.id,
        credit: 0,
        debit: advanceBalance,
      });
    }

    await Promise.all(salesPromises);
    journalDetails.push(
      {
        description: `Sale Receipt Creation for amount ${createReceiptDto.amount} ${advanceBalance > 0 ? 'with advance balance' : ''}`,
        nominalAccountId: customerAccount.id,
        credit: totalAmount,
        debit: 0,
      },
      {
        description: `Sale Receipt Creation for amount ${createReceiptDto.amount} ${advanceBalance > 0 ? 'with advance balance' : ''}`,
        nominalAccountId: bankAccount.id,
        credit: 0,
        debit: createReceiptDto.amount - totalDiscount,
      },
    );
    const x = this.receiptRepository.create({
      ...createReceiptDto,
      bank: { id: createReceiptDto.bankId },
      customer: { id: createReceiptDto.customerId },
      tenant: { id: tenantId },
      // journal,
    });
    const savedReceipt = await queryRunner.manager.save(Receipt, x);
    const journal = await this.journalService.create(
      {
        details: journalDetails,
        ref: createReceiptDto.ref,
        date: createReceiptDto.date,
        description: `Receipt ${savedReceipt.id} creating`,
      },
      queryRunner,
      false,
    );

    savedReceipt.journal = journal;
    const receipt = await queryRunner.manager.save(Receipt, savedReceipt);

    return receipt;
  }

  async getAll(filters: Record<string, any>) {
    const tenantId = this.tenantContextService.getTenantId();
    const queryBuilder = this.receiptRepository
      .createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.customer', 'customer')
      .leftJoinAndSelect('receipt.bank', 'bank')
      // .leftJoinAndSelect('receipt.journal', 'journal')
      .where('receipt.tenant.id = :tenantId', { tenantId })
      .orderBy('receipt.createdAt', 'DESC');
    const { page, limit } = filters;

    // Object.entries(filterFields).forEach(([key, value]) => {
    //   if (value && ALLOWED_FILTERS.includes(key)) {
    //     queryBuilder.andWhere(`receipt.${key} ILIKE :${key}`, {
    //       [key]: `%${value}%`,
    //     });
    //   }
    // });

    const paginated = await paginate(queryBuilder, page, limit);
    paginated.data = paginated.data.map((item) => {
      const instance = plainToInstance(Receipt, item);
      return instance;
    });
    return paginated;
  }

  async getOne(id: string): Promise<Receipt> {
    const receipt = await this.receiptRepository.findOne({ where: { id } });
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }
    return receipt;
  }
}
