import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from './entity/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { GenericService } from 'src/common/services/generic.service';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { AccountService } from 'src/account/account.service';
import { CreateAccountDto } from 'src/account/dto/create-account.dto';
import { AccountType } from 'src/account/interfaces/account-type.enum';
import { PARENT_ACCOUNT_IDS } from './constants/cutsomer.constants';
import { UpdateAccountDto } from 'src/account/dto/update-account.dto';
import { EntityType } from 'src/common/enums/entity-type.enum';

@Injectable()
export class CustomerService extends GenericService<
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto
> {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    tenantContextService: TenantContextService,
    private readonly accountService: AccountService,
  ) {
    super(customerRepository, tenantContextService, 'customer');
  }

  async incrementBalance(id: string, amount: number) {
    await this.customerRepository.increment({ id }, 'openingBalance', amount);
  }

  protected async afterCreate(
    entity: Customer,
    runner?: QueryRunner,
  ): Promise<void> {
    const creditAccount: CreateAccountDto = {
      name: entity.name,
      code: `${entity.code}-cr`,
      type: AccountType.SUB_ACCOUNT,
      parentId: PARENT_ACCOUNT_IDS.CREDIT,
      entityId: entity.id,
      entityType: EntityType.CUSTOMER,
      creditAmount: entity.openingBalance,
    };

    const debitAccount: CreateAccountDto = {
      name: entity.name,
      code: `${entity.code}-dr`,
      type: AccountType.SUB_ACCOUNT,
      parentId: PARENT_ACCOUNT_IDS.DEBIT,
      entityId: entity.id,
      entityType: EntityType.CUSTOMER,
      debitAmount: entity.openingBalance,
    };
    await this.accountService.create(creditAccount, runner);
    await this.accountService.create(debitAccount, runner);
  }

  protected async afterUpdate(
    entity: Customer,
    runner?: QueryRunner,
  ): Promise<void> {
    const accounts = await this.accountService.findByEntityIdAndType(
      entity.id,
      'customer',
    );

    if (!accounts?.length) {
      throw new NotFoundException(
        `Accounts not found for customer with ID ${entity.id}`,
      );
    }

    await Promise.all(
      accounts.map((account) => {
        const data: UpdateAccountDto = {
          ...account,
          entityType: EntityType.CUSTOMER,
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
    entity: Customer,
    runner?: QueryRunner,
  ): Promise<void> {
    const accounts = await this.accountService.findByEntityIdAndType(
      entity?.id,
      'customer',
    );
    if (!accounts?.length) {
      throw new NotFoundException(
        `Accounts not found for customer with ID ${entity?.id}`,
      );
    }
    await Promise.all(
      accounts.map((account) => this.accountService.delete(account.id, runner)),
    );
  }
}
