import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account } from './entity/account.entity';
import { AccountTree } from './interfaces/account-tree.interface';
import { AccountType } from './interfaces/account-type.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TenantGuard } from 'src/tenant/guards/tenant.guard';
import { Paginated } from 'src/common/utils/paginate';
import { AccountFilterDto } from './dto/account-filter.dto';

@Controller('accounts')
@UseGuards(TenantGuard)
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly AccountService: AccountService) {}

  @Post()
  @ResponseMetadata({ success: true, message: 'Account created successfully' })
  async create(@Body() createAccountDto: CreateAccountDto): Promise<Account> {
    return await this.AccountService.create(createAccountDto);
  }

  @Get()
  @ResponseMetadata({ success: true, message: 'Accounts fetched successfully' })
  async findAll(): Promise<AccountTree[]> {
    return await this.AccountService.findAll();
  }

  @Get(':type')
  @ResponseMetadata({ success: true, message: 'Accounts fetched successfully' })
  async findByType(
    @Param('type') type: AccountType,
    @Query() filters: AccountFilterDto,
  ): Promise<Paginated<Account>> {
    return await this.AccountService.findByType(type, filters);
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
