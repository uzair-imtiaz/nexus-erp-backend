import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService) => {
    const redis = new Redis({
      host: configService.get<string>('redis.host', 'localhost'),
      port: configService.get<number>('redis.port', 6379),
      password: configService.get<string>('redis.password'),
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    });

    redis.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    return redis;
  },
  inject: [ConfigService],
};
