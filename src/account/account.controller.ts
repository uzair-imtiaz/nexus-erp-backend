import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { CreateAccountDto } from './dto/create-account.dto';
import { Account } from './entity/account.entity';
import { AccountService } from './account.service';

@Controller('accounts')
export class AccountController {
  constructor(private readonly AccountService: AccountService) {}

  @Post()
  @ResponseMetadata({ success: true, message: 'Account created' })
  async create(@Body() createAccountDto: CreateAccountDto): Promise<Account> {
    return await this.AccountService.create(createAccountDto);
  }

  @Get()
  @ResponseMetadata({ success: true, message: 'Accounts found' })
  async findAll(@Query('type') type?: string): Promise<Account[]> {
    return await this.AccountService.findAll(type);
  }
}
