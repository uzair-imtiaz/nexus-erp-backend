import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountService } from 'src/account/account.service';
import { EntityType } from '../enums/entity-type.enum';
import { Account } from 'src/account/entity/account.entity';
import { QueryRunner } from 'typeorm';

@Injectable()
export class AccountManagerService {
  constructor(private readonly accountService: AccountService) {}

  async getValidAccountByEntityId(
    entityId: string,
    entityType: EntityType,
  ): Promise<Account> {
    const account = await this.accountService.findByEntityIdAndType(
      entityId,
      entityType,
    );
    if (!account) {
      throw new NotFoundException(
        `Account for ${entityType} with ID ${entityId} not found`,
      );
    }
    const validAccount = account.find((ba) => !ba.code.endsWith('cr'))!;
    return validAccount;
  }

  async getValidAccount(
    accountId: string,
    tenantId: string,
    queryRunner: QueryRunner,
  ): Promise<Account> {
    const account = await queryRunner.manager.findOne(Account, {
      where: { id: accountId, tenant: { id: tenantId } },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }
    if (String(account.code).endsWith('cr')) {
      throw new BadRequestException(
        'General Reserves account cannot be used for expenses',
      );
    }
    return account;
  }
}
