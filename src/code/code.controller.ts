import { Controller, Get, Param, Query } from '@nestjs/common';
import { CodeService } from './code.service';

@Controller('code')
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  @Get()
  async getNextCode(
    @Query('entity') tableName: string,
  ): Promise<{ code: string }> {
    const code = await this.codeService.getNextCode(tableName);
    return { code };
  }
}
