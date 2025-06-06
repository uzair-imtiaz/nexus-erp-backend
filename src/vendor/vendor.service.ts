import { Injectable, NotFoundException } from '@nestjs/common';
import { GenericService } from 'src/common/services/generic.service';
import { Vendor } from './entity/vendor.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateContactDto } from 'src/common/dtos/update-contact-base.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { UpdateAccountDto } from 'src/account/dto/update-account.dto';
import { AccountType } from 'src/account/interfaces/account-type.enum';
import { PARENT_ACCOUNT_IDS } from './contsants/vendor.constants';
import { CreateAccountDto } from 'src/account/dto/create-account.dto';
import { AccountService } from 'src/account/account.service';

@Injectable()
export class VendorService extends GenericService<
  Vendor,
  CreateVendorDto,
  UpdateContactDto
> {
  constructor(
    @InjectRepository(Vendor) vendorRepository: Repository<Vendor>,
    tenantContextService: TenantContextService,
    private readonly accountService: AccountService,
  ) {
    super(vendorRepository, tenantContextService, 'vendor');
  }
  protected async afterCreate(
    entity: Vendor,
    runner?: QueryRunner,
  ): Promise<void> {
    const creditAccount: CreateAccountDto = {
      name: entity.name,
      code: `${entity.code}-0`,
      type: AccountType.SUB_ACCOUNT,
      parentId: PARENT_ACCOUNT_IDS.CREDIT,
      entityId: entity.id,
      entityType: 'vendor',
      creditAmount: entity.openingBalance,
    };

    const debitAccount: CreateAccountDto = {
      name: entity.name,
      code: `${entity.code}-1`,
      type: AccountType.SUB_ACCOUNT,
      parentId: PARENT_ACCOUNT_IDS.DEBIT,
      entityId: entity.id,
      entityType: 'vendor',
      debitAmount: entity.openingBalance,
    };
    await this.accountService.create(creditAccount, runner);
    await this.accountService.create(debitAccount, runner);
  }

  protected async afterUpdate(
    entity: Vendor,
    runner?: QueryRunner,
  ): Promise<void> {
    const accounts = await this.accountService.findByEntityIdAndType(
      entity.id,
      'vendor',
    );

    if (!accounts?.length) {
      throw new NotFoundException(
        `Accounts not found for vendor with ID ${entity.id}`,
      );
    }

    await Promise.all(
      accounts.map((account) => {
        const data: UpdateAccountDto = {
          ...account,
          name: entity.name,
        };
        if (Number(account.debitAmount)) {
          data['debitAmount'] = entity.openingBalance;
        }
        if (Number(account.creditAmount)) {
          data['creditAmount'] = entity.openingBalance;
        }
        return this.accountService.update(account.id, data, runner);
      }),
    );
  }

  protected async afterDelete(
    entity: Vendor,
    runner?: QueryRunner,
  ): Promise<void> {
    const accounts = await this.accountService.findByEntityIdAndType(
      entity?.id,
      'vendor',
    );
    if (!accounts?.length) {
      throw new NotFoundException(
        `Accounts not found for vendor with ID ${entity?.id}`,
      );
    }
    await Promise.all(
      accounts.map((account) => this.accountService.delete(account.id, runner)),
    );
  }
}
