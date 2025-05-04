import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccountDto } from './dto/create-account.dto';
import { Account } from './entity/account-base.entity';

@Injectable()
export class SubcategoriesService {
  constructor(@InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    const { name, type, parentAccount } = createAccountDto;
    let parent: Account | undefined;
    if (parentAccount) {
      const _parent = await this.accountRepository.findOneBy({ id: parentAccount });
      if (!parent) {
        throw new NotFoundException('Parent account not found');
      }
      parent = _parent || undefined;
    }
    this.accountRepository.create
    const account = this.accountRepository.create({name, type, parentAccount: parent});
    return await this.accountRepository.save(account);
    
  }

  async findAll(): Promise<Account[]> {
    return await this.accountRepository.find({
      relations: ['parentAccount'],
    })
  }
}
