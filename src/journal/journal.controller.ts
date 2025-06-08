import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { JournalService } from './journal.service';
import { TransactionInterceptor } from 'src/common/interceptors/transaction.interceptor';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { CreateJournalDto } from './dto/create-journal.dto';
import { TransactionRequest } from 'src/common/interfaces/TransactionRequest';
import { JournalFilterDto } from './dto/journal-filter.dto';

@Controller('journals')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post()
  @UseInterceptors(TransactionInterceptor)
  @ResponseMetadata({
    success: true,
    message: 'Journal created successfully',
  })
  create(
    @Body() createJournalDto: CreateJournalDto,
    @Req() req: TransactionRequest,
  ) {
    return this.journalService.create(createJournalDto, req.queryRunner);
  }

  @Get()
  @ResponseMetadata({
    success: true,
    message: 'Journals fetched successfully',
  })
  findAll(@Query() filters: JournalFilterDto) {
    return this.journalService.findAll(filters);
  }
}
