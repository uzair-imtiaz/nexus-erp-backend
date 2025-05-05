import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { CreateAccountDto } from './dto/create-account.dto';
import { Account } from './entity/account-base.entity';
import { SubcategoriesService } from './subcategories.service';

@Controller('accounts')
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Post()
  @ResponseMetadata({ success: true, message: 'Account created' })
  async create(@Body() createAccountDto: CreateAccountDto): Promise<Account> {
    return await this.subcategoriesService.create(createAccountDto);
  }

  @Get()
  @ResponseMetadata({ success: true, message: 'Accounts found' })
  async findAll(@Query('type') type?: string): Promise<Account[]> {
    return await this.subcategoriesService.findAll(type);
  }
}
