import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({})
export class QueuesModule {
  static forRootAsync(options: { queues: string[] }): DynamicModule {
    return {
      module: QueuesModule,
      imports: [
        BullModule.forRootAsync({
          useFactory: (configService: ConfigService) => ({
            connection: {
              host: configService.get<string>('redis.host', 'localhost'),
              port: configService.get<number>('redis.port', 6379),
              password: configService.get<string>('redis.password'),
            },
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: 1000,
            },
          }),
          inject: [ConfigService],
        }),
        ...options.queues.map((queue) =>
          BullModule.registerQueue({ name: queue }),
        ),
      ],
      exports: [BullModule],
    };
  }
}
