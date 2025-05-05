import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bank } from './entity/bank.entity';
import { UpdateBankDto } from './dto/update-bank.dto';
import { CreateBankDto } from './dto/create-bank.dto';

@Injectable()
export class BankService {
    constructor(@InjectRepository(Bank) private bankRepository: Repository<Bank>) {}

    async findAll(): Promise<Bank[]> {
        return await this.bankRepository.find();
    }

    async findOne(id: string) {
        return await this.bankRepository.findOne({ where: { id } });
    }

    async update(id: string, updateBankDto: UpdateBankDto) {
        const updated = await this.bankRepository.update(id, updateBankDto);
        if (!updated) {
            throw new NotFoundException(`Bank with ID ${id} not found`);
        }
        return updated;
    }

    async remove(id: string) {
        return await this.bankRepository.delete(id);
    }

    create(createBankDto: CreateBankDto): Promise<Bank> {
        const bank = this.bankRepository.create(createBankDto);
        return this.bankRepository.save(bank);
      }
}
