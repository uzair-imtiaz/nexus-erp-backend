import { Injectable, NotFoundException } from '@nestjs/common';
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
    private readonly entityServiceManager: EntityServiceManager,
    private readonly accountService: AccountService,
  ) {}

  async create(
    createJournalDto: CreateJournalDto,
    queryRunner: QueryRunner,
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
            qb.where('account.tenantId = :tenantId', { tenantId }).orWhere(
              'account.system_generated = true',
            );
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

      if (account.entityType) {
        await this.entityServiceManager.incrementEntityBalance(
          account.entityType as EntityType,
          account.entityId,
          debit - credit,
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
      queryBuilder.andWhere('journal.date <= :dateTo', {
        dateTo: date_to as string,
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
}
