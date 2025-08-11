import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { VendorService } from 'src/vendor/vendor.service';
import { CustomerService } from 'src/customer/customer.service';
import { InventoryService } from 'src/inventory/inventory.service';
import { EntityType } from '../enums/entity-type.enum';
import { BankService } from 'src/bank/bank.service';
import { QueryRunner } from 'typeorm';

@Injectable()
export class EntityServiceManager {
  constructor(
    @Inject(forwardRef(() => VendorService))
    private vendorService: VendorService,
    private customerService: CustomerService,
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
    @Inject(forwardRef(() => BankService))
    private bankService: BankService,
  ) {}

  async incrementEntityBalance(
    entityType: EntityType,
    entityId: string,
    amount: number,
    queryRunner?: QueryRunner,
    columnName?: string,
  ) {
    switch (entityType) {
      case EntityType.VENDOR:
        await this.vendorService.incrementBalance(
          entityId,
          amount,
          columnName || 'openingBalance',
          queryRunner,
        );
        break;
      case EntityType.CUSTOMER:
        await this.customerService.incrementBalance(
          entityId,
          amount,
          columnName || 'openingBalance',
          queryRunner,
        );
        break;
      case EntityType.INVENTORY:
        await this.inventoryService.incrementBalance(
          entityId,
          amount,
          columnName || 'amount',
          queryRunner,
        );
        break;
      case EntityType.BANK:
        await this.bankService.incrementBalance(
          entityId,
          amount,
          columnName || 'currentBalance',
          queryRunner,
        );
        break;
      default:
        throw new BadRequestException('Invalid entity type');
    }
  }
}
