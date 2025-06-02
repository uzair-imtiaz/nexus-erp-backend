import { PartialType } from '@nestjs/mapped-types';
import { CreateExpenseDto } from './create-expense.dto';

export class updateExpenseDto extends PartialType(CreateExpenseDto) {}
