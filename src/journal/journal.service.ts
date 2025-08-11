import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { AccountService } from 'src/account/account.service';
import { UpdateAccountDto } from 'src/account/dto/update-account.dto';
import { Account } from 'src/account/entity/account.entity';
import { EntityType } from 'src/common/enums/entity-type.enum';
import { EntityServiceManager } from 'src/common/services/entity-service-manager.service';
import { paginate, Paginated } from 'src/common/utils/paginate';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { Brackets, QueryRunner, Repository } from 'typeorm';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JournalDetail } from './entity/journal-detail.entity';
import { Journal } from './entity/journal.entity';

@Injectable()
export class JournalService {
  constructor(
    @InjectRepository(Journal) private journalRepository: Repository<Journal>,
    @InjectRepository(JournalDetail)
    private journalDetailRepository: Repository<JournalDetail>,
    private readonly tenantContextService: TenantContextService,
    @Inject(forwardRef(() => EntityServiceManager))
    private readonly entityServiceManager: EntityServiceManager,
    private readonly accountService: AccountService,
  ) {}

  async create(
    createJournalDto: CreateJournalDto,
    queryRunner: QueryRunner,
    shouldIncrementEntityBalance = true,
  ): Promise<Journal> {
    const tenantId = this.tenantContextService.getTenantId()!;

    const journal = this.journalRepository.create({
      ...createJournalDto,
      tenant: { id: tenantId },
    });

    // Process all details sequentially to avoid race conditions
    for (const detail of createJournalDto.details) {
      const account = await queryRunner.manager
        .createQueryBuilder(Account, 'account')
        .where('account.id = :id', { id: detail.nominalAccountId })
        .andWhere(
          new Brackets((qb) => {
            qb.where('account.tenantId = :tenantId', { tenantId });
          }),
        )
        .getOne();
      if (!account) {
        throw new NotFoundException(
          `Account with ID ${detail.nominalAccountId} not found`,
        );
      }

      // Ensure proper number formatting and type conversion
      const debit = Number(detail.debit) || 0;
      const credit = Number(detail.credit) || 0;
      const currentDebitAmount = Number(account.debitAmount) || 0;
      const currentCreditAmount = Number(account.creditAmount) || 0;

      const UpdateAccountDto: UpdateAccountDto = {
        debitAmount: currentDebitAmount + debit,
        creditAmount: currentCreditAmount + credit,
      };

      await this.accountService.update(
        account.id,
        UpdateAccountDto,
        queryRunner,
      );

      // causing imbalance in the accounts
      if (account.entityType && shouldIncrementEntityBalance) {
        await this.entityServiceManager.incrementEntityBalance(
          account.entityType as EntityType,
          account.entityId,
          account.entityType === EntityType.VENDOR
            ? credit - debit
            : debit - credit,
          queryRunner,
        );
      }

      const journalDetail = this.journalDetailRepository.create({
        nominalAccount: { id: detail.nominalAccountId },
        journal,
        debit: debit,
        credit: credit,
        description: detail.description,
        tenant: { id: tenantId },
      });
      await queryRunner.manager.save(JournalDetail, journalDetail);
      journal.details.push(journalDetail);
    }

    const savedJournal = await queryRunner.manager.save(Journal, journal);
    return savedJournal;
  }

  async findAll(filters: Record<string, any>): Promise<Paginated<Journal>> {
    const tenantId = this.tenantContextService.getTenantId()!;

    const queryBuilder = this.journalRepository
      .createQueryBuilder('journal')
      .leftJoinAndSelect('journal.details', 'details')
      .leftJoinAndSelect('details.nominalAccount', 'nominalAccount')
      .where('journal.tenant.id = :tenantId', { tenantId });

    const { page, limit, ref, nominal_account_ids, date_from, date_to } =
      filters;

    if (ref) {
      queryBuilder.andWhere('journal.ref = :ref', { ref });
    }

    if (
      nominal_account_ids &&
      Array.isArray(nominal_account_ids) &&
      nominal_account_ids.length
    ) {
      queryBuilder.andWhere(
        'details.nominal_account_id IN (:...nominalAccountIds)',
        {
          nominalAccountIds: nominal_account_ids,
        },
      );
    }

    if (date_from) {
      queryBuilder.andWhere('journal.date >= :dateFrom', {
        dateFrom: date_from as string,
      });
    }
    if (date_to) {
      const endOfDay = new Date(date_to);
      endOfDay.setHours(23, 59, 59, 999);

      queryBuilder.andWhere('journal.date <= :dateTo', {
        dateTo: endOfDay.toISOString(),
      });
    }

    queryBuilder.orderBy('journal.date', 'DESC');

    const paginated = await paginate(queryBuilder, page, limit);
    paginated.data = paginated.data.map((item) =>
      plainToInstance(Journal, item),
    );

    return paginated;
  }

  async findOne(id: string): Promise<Journal> {
    const tenantId = this.tenantContextService.getTenantId();
    const journal = await this.journalRepository.findOne({
      where: { id, tenant: { id: tenantId } },
      relations: ['details'],
    });
    if (!journal) {
      throw new NotFoundException('Journal not found');
    }
    return plainToInstance(Journal, journal);
  }

  async update(
    id: string,
    updateJournalDto: CreateJournalDto,
    queryRunner: QueryRunner,
  ): Promise<Journal> {
    const tenantId = this.tenantContextService.getTenantId()!;
    const existingJournal = await this.findOne(id);

    // Create a map of existing details for quick lookup
    const existingDetailsMap = new Map(
      existingJournal.details.map((detail) => [
        detail.nominalAccount.id,
        detail,
      ]),
    );

    // Process all details sequentially to avoid race conditions
    for (const detail of updateJournalDto.details) {
      const account = await queryRunner.manager
        .createQueryBuilder(Account, 'account')
        .where('account.id = :id', { id: detail.nominalAccountId })
        .andWhere(
          new Brackets((qb) => {
            qb.where('account.tenantId = :tenantId', { tenantId });
            // .orWhere(
            //   'account.system_generated = true',
            // );
          }),
        )
        .getOne();

      if (!account) {
        throw new NotFoundException(
          `Account with ID ${detail.nominalAccountId} not found`,
        );
      }

      const newDebit = Number(detail.debit) || 0;
      const newCredit = Number(detail.credit) || 0;
      const currentDebitAmount = Number(account.debitAmount) || 0;
      const currentCreditAmount = Number(account.creditAmount) || 0;

      // Get the existing detail if it exists
      const existingDetail = existingDetailsMap.get(detail.nominalAccountId);
      const oldDebit = existingDetail ? Number(existingDetail.debit) || 0 : 0;
      const oldCredit = existingDetail ? Number(existingDetail.credit) || 0 : 0;

      // Calculate the difference to apply
      const debitDiff = newDebit - oldDebit;
      const creditDiff = newCredit - oldCredit;

      const UpdateAccountDto: UpdateAccountDto = {
        debitAmount: currentDebitAmount + debitDiff,
        creditAmount: currentCreditAmount + creditDiff,
      };

      await this.accountService.update(
        account.id,
        UpdateAccountDto,
        queryRunner,
      );

      if (account.entityType) {
        await this.entityServiceManager.incrementEntityBalance(
          account.entityType as EntityType,
          account.entityId,
          debitDiff - creditDiff,
        );
      }

      // Update or create journal detail
      if (existingDetail) {
        existingDetail.debit = newDebit;
        existingDetail.credit = newCredit;
        existingDetail.description = detail.description || '';
        await queryRunner.manager.save(JournalDetail, existingDetail);
      } else {
        const journalDetail = this.journalDetailRepository.create({
          nominalAccount: { id: detail.nominalAccountId },
          journal: { id },
          debit: newDebit,
          credit: newCredit,
          description: detail.description,
          tenant: { id: tenantId },
        });
        await queryRunner.manager.save(JournalDetail, journalDetail);
      }
    }

    // Remove details that are no longer present
    const newDetailIds = new Set(
      updateJournalDto.details.map((d) => d.nominalAccountId),
    );
    for (const [accountId, detail] of existingDetailsMap) {
      if (!newDetailIds.has(accountId)) {
        // Reverse the amounts for removed details
        const account = await queryRunner.manager
          .createQueryBuilder(Account, 'account')
          .where('account.id = :id', { id: accountId })
          .andWhere(
            new Brackets((qb) => {
              qb.where('account.tenantId = :tenantId', { tenantId });
              // .orWhere(
              //   'account.system_generated = true',
              // );
            }),
          )
          .getOne();

        if (account) {
          const currentDebitAmount = Number(account.debitAmount) || 0;
          const currentCreditAmount = Number(account.creditAmount) || 0;

          const UpdateAccountDto: UpdateAccountDto = {
            debitAmount: currentDebitAmount - Number(detail.debit),
            creditAmount: currentCreditAmount - Number(detail.credit),
          };

          await this.accountService.update(
            account.id,
            UpdateAccountDto,
            queryRunner,
          );

          if (account.entityType) {
            await this.entityServiceManager.incrementEntityBalance(
              account.entityType as EntityType,
              account.entityId,
              Number(detail.credit) - Number(detail.debit),
            );
          }
        }

        await queryRunner.manager.delete(JournalDetail, { id: detail.id });
      }
    }

    // Update the journal metadata
    const updatedJournal = await queryRunner.manager.save(Journal, {
      ...existingJournal,
      ...updateJournalDto,
      id,
      tenant: { id: tenantId },
    });

    return updatedJournal;
  }

  async delete(id: string, queryRunner: QueryRunner): Promise<void> {
    const tenantId = this.tenantContextService.getTenantId()!;
    const journal = await this.findOne(id);

    // Reverse all journal entries
    for (const detail of journal.details) {
      const account = await queryRunner.manager
        .createQueryBuilder(Account, 'account')
        .where('account.id = :id', { id: detail.nominalAccount.id })
        .andWhere(
          new Brackets((qb) => {
            qb.where('account.tenantId = :tenantId', { tenantId });
            // .orWhere(
            //   'account.system_generated = true',
            // );
          }),
        )
        .getOne();

      if (!account) {
        throw new NotFoundException(
          `Account with ID ${detail.nominalAccount.id} not found`,
        );
      }

      const currentDebitAmount = Number(account.debitAmount) || 0;
      const currentCreditAmount = Number(account.creditAmount) || 0;

      // Reverse the amounts
      const UpdateAccountDto: UpdateAccountDto = {
        debitAmount: currentDebitAmount - Number(detail.debit),
        creditAmount: currentCreditAmount - Number(detail.credit),
      };

      await this.accountService.update(
        account.id,
        UpdateAccountDto,
        queryRunner,
      );

      if (account.entityType) {
        await this.entityServiceManager.incrementEntityBalance(
          account.entityType as EntityType,
          account.entityId,
          Number(detail.credit) - Number(detail.debit), // Reverse the balance
        );
      }
    }

    // Delete journal details first (due to foreign key constraints)
    await queryRunner.manager.delete(JournalDetail, {
      journal: { id },
    });

    // Delete the journal
    await queryRunner.manager.delete(Journal, { id });
  }
}
