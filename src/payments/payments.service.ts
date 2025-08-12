import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { AccountService } from 'src/account/account.service';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { AccountManagerService } from 'src/common/services/account-manager.service';
import { EntityServiceManager } from 'src/common/services/entity-service-manager.service';
import { paginate } from 'src/common/utils/paginate';
import { JournalDetailDto } from 'src/journal/dto/create-journal.dto';
import { JournalService } from 'src/journal/journal.service';
import { PurchaseService } from 'src/purchase/purchase.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { QueryRunner, Repository } from 'typeorm';
import { CreatePaymentdto } from './dto/create-payment.dto';
import { Payment } from './entity/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private paymentRepository: Repository<Payment>,
    private readonly tenantContextService: TenantContextService,
    private readonly journalService: JournalService,
    private readonly purchaseService: PurchaseService,
    private readonly accountManagerService: AccountManagerService,
    private readonly accountService: AccountService,
    private readonly entityServiceManager: EntityServiceManager,
  ) {}

  async create(createPaymentDto: CreatePaymentdto, queryRunner: QueryRunner) {
    const tenantId = this.tenantContextService.getTenantId()!;
    const journalDetails: JournalDetailDto[] = [];

    const discountAccount = await this.accountService.findOne({
      name: 'Discount Allowed',
    });

    if (!discountAccount) {
      throw new NotFoundException('Discount Account not found');
    }

    const purchasesPromises: Promise<void>[] = [];
    let totalAmount = 0;
    let totalDiscount = 0;

    if (createPaymentDto.transactions) {
      for (const purchase of createPaymentDto.transactions) {
        purchasesPromises.push(
          this.purchaseService.updateOutstandingBalance(
            purchase.id,
            purchase.amount + (purchase.discount ?? 0),
          ),
        );
        totalAmount += purchase.amount;
        if (purchase.discount) {
          journalDetails.push({
            description: `Discount on payment for purchase ${purchase.id}`,
            nominalAccountId: discountAccount.id,
            credit: 0,
            debit: purchase.discount,
          });
          totalDiscount += purchase.discount ?? 0;
        }
      }
    }

    const advanceBalance = createPaymentDto.amount - totalAmount;
    const vendorAccount =
      await this.accountManagerService.getValidAccountByEntityId(
        createPaymentDto.vendorId,
        EntityType.VENDOR,
      );

    const bankAccount =
      await this.accountManagerService.getValidAccountByEntityId(
        createPaymentDto.bankId,
        EntityType.BANK,
      );
    if (advanceBalance > 0) {
      this.entityServiceManager.incrementEntityBalance(
        EntityType.VENDOR,
        createPaymentDto.vendorId,
        advanceBalance,
        queryRunner,
        'openingBalance',
      );
      journalDetails.push({
        description: `Advance balance via payment ${createPaymentDto.ref}`,
        nominalAccountId: vendorAccount.id,
        credit: 0,
        debit: advanceBalance,
      });
    }

    await Promise.all(purchasesPromises);
    journalDetails.push(
      {
        description: `Purchase Payment Creation for amount ${createPaymentDto.amount} ${advanceBalance > 0 ? 'with advance balance' : ''}`,
        nominalAccountId: vendorAccount.id,
        credit: totalAmount,
        debit: 0,
      },
      {
        description: `Purchase Payment Creation for amount ${createPaymentDto.amount} ${advanceBalance > 0 ? 'with advance balance' : ''}`,
        nominalAccountId: bankAccount.id,
        credit: 0,
        debit: createPaymentDto.amount - totalDiscount,
      },
    );
    const x = this.paymentRepository.create({
      ...createPaymentDto,
      bank: { id: createPaymentDto.bankId },
      vendor: { id: createPaymentDto.vendorId },
      tenant: { id: tenantId },
      // journal,
    });
    const savedPayment = await queryRunner.manager.save(Payment, x);
    const journal = await this.journalService.create(
      {
        details: journalDetails,
        ref: createPaymentDto.ref,
        date: createPaymentDto.date,
        description: `Payment ${savedPayment.id} creating`,
      },
      queryRunner,
      false,
    );

    savedPayment.journal = journal;
    const payment = await queryRunner.manager.save(Payment, savedPayment);

    return payment;
  }

  async findAll(filters: Record<string, any>) {
    const tenantId = this.tenantContextService.getTenantId();
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.vendor', 'vendor')
      .leftJoinAndSelect('payment.bank', 'bank')
      // .leftJoinAndSelect('payment.journal', 'journal')
      .where('payment.tenant.id = :tenantId', { tenantId })
      .orderBy('payment.createdAt', 'DESC');
    const { page, limit } = filters;

    // Object.entries(filterFields).forEach(([key, value]) => {
    //   if (value && ALLOWED_FILTERS.includes(key)) {
    //     queryBuilder.andWhere(`payment.${key} ILIKE :${key}`, {
    //       [key]: `%${value}%`,
    //     });
    //   }
    // });

    const paginated = await paginate(queryBuilder, page, limit);
    paginated.data = paginated.data.map((item) => {
      const instance = plainToInstance(Payment, item);
      return instance;
    });
    return paginated;
  }

  async getOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }
}
