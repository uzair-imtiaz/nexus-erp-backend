import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bank } from './entity/bank.entity';
import { UpdateBankDto } from './dto/update-bank.dto';
import { CreateBankDto } from './dto/create-bank.dto';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class BankService {
  constructor(
    @InjectRepository(Bank) private bankRepository: Repository<Bank>,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async findAll(): Promise<Bank[]> {
    const tenantId = this.tenantContextService.getTenantId();
    return await this.bankRepository.find({
      where: { tenant: { id: tenantId } },
    });
  }

  async findOne(id: string) {
    const tenantId = this.tenantContextService.getTenantId();
    return await this.bankRepository.findOne({
      where: { id, tenant: { id: tenantId } },
    });
  }

  async update(id: string, updateBankDto: UpdateBankDto) {
    const tenantId = this.tenantContextService.getTenantId();
    const bank = await this.bankRepository.findOneBy({
      id,
      tenant: { id: tenantId },
    });
    if (!bank) {
      throw new NotFoundException(`Bank with ID ${id} not found`);
    }

    const updatedBank = this.bankRepository.merge(bank, updateBankDto);
    return await this.bankRepository.save(updatedBank);
  }

  async remove(id: string) {
    const tenantId = this.tenantContextService.getTenantId();
    const bank = await this.bankRepository.findOneBy({
      id,
      tenant: { id: tenantId },
    });
    if (!bank) {
      throw new NotFoundException(`Bank with ID ${id} not found`);
    }
    await this.bankRepository.delete(id);
    return { message: 'Bank deleted successfully' };
  }

  create(createBankDto: CreateBankDto): Promise<Bank> {
    const tenantId = this.tenantContextService.getTenantId();
    const bank = this.bankRepository.create({
      ...createBankDto,
      tenant: { id: tenantId },
    });
    return this.bankRepository.save(bank);
  }
}
