import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisClient.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      return null;
    }
  }

  async getHash<T extends Record<string, any>>(key: string): Promise<T | null> {
    const result = await this.redisClient.hgetall(key);
    if (Object.keys(result)?.length === 0) return null;

    const parsed = {} as T;
    for (const [field, value] of Object.entries(result)) {
      parsed[field as keyof T] = this.parseValue(value);
    }
    return parsed;
  }

  private parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(Number(value))) return Number(value);
    return value;
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    if (ttlSeconds) {
      return this.redisClient.set(key, value, 'EX', ttlSeconds);
    }
    return this.redisClient.set(key, value);
  }

  async setHash(key: string, obj: Record<string, any>, ttlSeconds?: number) {
    const flattened = Object.entries(obj).flatMap(([field, value]) => [
      field,
      value,
    ]);
    await this.redisClient.hset(key, ...flattened);
    if (ttlSeconds) {
      await this.redisClient.expire(key, ttlSeconds);
    }
  }

  async setMHash(
    key: string,
    values: Record<string, string | number | boolean>,
  ): Promise<void> {
    if (Object.keys(values).length === 0) return;

    await this.redisClient.hset(key, values);
  }

  async deleteHash(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}
