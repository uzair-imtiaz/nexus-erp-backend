import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { BankService } from './bank.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';

@Controller('banks')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post()
  create(@Body() dto: CreateBankDto) {
    return this.bankService.create(dto);
  }

  @Get()
  findAll() {
    return this.bankService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bankService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBankDto) {
    return this.bankService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bankService.remove(id);
  }
}
