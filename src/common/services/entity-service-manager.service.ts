import { Injectable, BadRequestException } from '@nestjs/common';
import { VendorService } from 'src/vendor/vendor.service';
import { CustomerService } from 'src/customer/customer.service';
import { InventoryService } from 'src/inventory/inventory.service';
import { EntityType } from '../enums/entity-type.enum';

@Injectable()
export class EntityServiceManager {
  constructor(
    private vendorService: VendorService,
    private customerService: CustomerService,
    private inventoryService: InventoryService,
  ) {}

  async incrementEntityBalance(
    entityType: EntityType,
    entityId: string,
    amount: number,
  ) {
    switch (entityType) {
      case EntityType.VENDOR:
        await this.vendorService.incrementBalance(entityId, amount);
        break;
      case EntityType.CUSTOMER:
        await this.customerService.incrementBalance(entityId, amount);
        break;
      case EntityType.INVENTORY:
        await this.inventoryService.incrementBalance(entityId, amount);
        break;
      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }
  }
}
