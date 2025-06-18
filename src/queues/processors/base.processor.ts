import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export abstract class BaseProcessor {
  protected readonly logger = new Logger(this.constructor.name);

  protected handleError(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}
