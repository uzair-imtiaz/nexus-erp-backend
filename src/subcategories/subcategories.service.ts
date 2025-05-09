import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccountDto } from './dto/create-account.dto';
import { Account } from './entity/account-base.entity';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class SubcategoriesService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    const tenantId = this.tenantContextService.getTenantId();
    const { name, type, parentAccount } = createAccountDto;
    let parent: Account | undefined;
    if (parentAccount) {
      const _parent = await this.accountRepository.findOneBy({
        id: parentAccount,
      });
      if (!parent) {
        throw new NotFoundException('Parent account not found');
      }
      parent = _parent || undefined;
    }
    this.accountRepository.create;
    const account = this.accountRepository.create({
      name,
      type,
      parentAccount: parent,
      tenant: { id: tenantId },
    });
    return await this.accountRepository.save(account);
  }

  async findAll(type?: string): Promise<Account[]> {
    const tenantId = this.tenantContextService.getTenantId();
    const where: any = { tenant: { id: tenantId } };

    if (type?.trim()) {
      where.type = type;
    }
    return this.accountRepository.find({
      relations: ['parentAccount'],
      where,
    });
  }
}
