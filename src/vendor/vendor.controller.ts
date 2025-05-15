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
import { VendorService } from './vendor.service';
import { ResponseMetadata } from 'src/common/decorators/response-metadata.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { VendorFilterDto } from './dto/vendor-filter.dto';

@Controller('vendor')
@UseGuards(JwtAuthGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @ResponseMetadata({
    success: true,
    message: 'Vendor created successfully',
  })
  async create(createVendorDto: CreateVendorDto) {
    return await this.vendorService.create(createVendorDto);
  }

  @Get()
  @ResponseMetadata({
    success: true,
    message: 'Vendors fetched successfully',
  })
  async findAll(@Query() filters: VendorFilterDto) {
    return await this.vendorService.findAll(filters);
  }

  @Get(':id')
  @ResponseMetadata({
    success: true,
    message: 'Vendor fetched successfully',
  })
  async findOne(@Param('id') id: string) {
    return await this.vendorService.findOne(id);
  }

  @Put(':id')
  @ResponseMetadata({
    success: true,
    message: 'Vendor updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    return await this.vendorService.update(id, updateVendorDto);
  }

  @Delete(':id')
  @ResponseMetadata({
    success: true,
    message: 'Vendor deleted successfully',
  })
  async remove(@Param('id') id: string) {
    return await this.vendorService.remove(id);
  }
}
