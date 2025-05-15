import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { CreateAccountDto } from './dto/create-account.dto';
import { Account } from './entity/account.entity';
import { AccountService } from './account.service';
import { AccountType } from './interfaces/account-type.enum';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('accounts')
export class AccountController {
  constructor(private readonly AccountService: AccountService) {}

  @Post()
  @ResponseMetadata({ success: true, message: 'Account created successfully' })
  async create(@Body() createAccountDto: CreateAccountDto): Promise<Account> {
    return await this.AccountService.create(createAccountDto);
  }

  @Get()
  @ResponseMetadata({ success: true, message: 'Accounts fetched successfully' })
  async findAll(): Promise<Account[]> {
    return await this.AccountService.findAll();
  }

  @Get(':type')
  @ResponseMetadata({ success: true, message: 'Accounts fetched successfully' })
  async findByType(@Query('type') type: AccountType): Promise<Account[]> {
    return await this.AccountService.findByType(type);
  }

  @Put(':id')
  @ResponseMetadata({ success: true, message: 'Account updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return await this.AccountService.update(id, updateAccountDto);
  }

  @Delete(':id')
  @ResponseMetadata({ success: true, message: 'Account deleted successfully' })
  async delete(@Param('id') id: string) {
    return await this.AccountService.delete(id);
  }
}
