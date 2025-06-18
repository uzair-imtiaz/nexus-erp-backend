import { Module, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { QueuesModule } from './queues.module';

@Module({
  imports: [QueuesModule.forRootAsync()],
  exports: [BullBoardModule],
})
export class BullBoardModule implements OnModuleInit {
  private serverAdapter = new ExpressAdapter();

  constructor(
    @InjectQueue('sales') private salesQueue: Queue,
    @InjectQueue('purchases') private purchasesQueue: Queue,
  ) {}

  onModuleInit() {
    this.serverAdapter.setBasePath('/queues');

    createBullBoard({
      queues: [
        new BullMQAdapter(this.salesQueue),
        new BullMQAdapter(this.purchasesQueue),
      ],
      serverAdapter: this.serverAdapter,
    });
  }

  getServerAdapter() {
    return this.serverAdapter;
  }
}
