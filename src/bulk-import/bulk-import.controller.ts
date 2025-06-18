// src/modules/bulk-data/bulk-data.controller.ts

import {
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BulkImportService } from './bulk-import.service';

@Controller('bulk-import')
export class BulkImportController {
  constructor(private readonly bulkDataService: BulkImportService) {}

  @Post(':entity/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('entity') entity: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bulkDataService.importBulkData(entity, file);
  }
}
