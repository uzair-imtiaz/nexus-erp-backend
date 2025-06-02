import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { Paginated } from 'src/common/utils/paginate';
import { Expense } from './entity/expense.entity';
import { TransactionInterceptor } from 'src/common/interceptors/transaction.interceptor';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { TransactionRequest } from 'src/common/interfaces/TransactionRequest';
import { updateExpenseDto } from './dto/update-expense.dto';

@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get()
  async findAll(
    @Query() filters: ExpenseFilterDto,
  ): Promise<Paginated<Expense>> {
    return await this.expenseService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Expense> {
    return await this.expenseService.findOne(id);
  }

  @UseInterceptors(TransactionInterceptor)
  @Post()
  async create(
    @Body() createExpenseDto: CreateExpenseDto,
    @Req() req: TransactionRequest,
  ): Promise<Expense> {
    return await this.expenseService.create(createExpenseDto, req.queryRunner);
  }

  @Put(':id')
  @UseInterceptors(TransactionInterceptor)
  async update(
    @Param('id') id: string,
    @Body() updateExpenseDto: updateExpenseDto,
    @Req() req: TransactionRequest,
  ) {
    return await this.expenseService.update(
      id,
      updateExpenseDto,
      req.queryRunner,
    );
  }

  @Delete(':id')
  @UseInterceptors(TransactionInterceptor)
  async delete(@Param('id') id: string, @Req() req: TransactionRequest) {
    return await this.expenseService.delete(id, req.queryRunner);
  }
}
