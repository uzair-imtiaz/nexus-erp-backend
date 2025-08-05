import { Account } from 'src/account/entity/account.entity';
import { EntityType } from '../enums/entity-type.enum';
import * as fs from 'fs';
import * as path from 'path';

export const getKeyForEntityFromAccountForRedis = (
  account: Account,
  tenantId: string,
) => {
  const key = `accountByEntity:${tenantId}:${account.entityType}:${account.entityId}:${
    String(account.code).endsWith('cr') ? 'reserves' : 'regular'
  }`;
  return key;
};

export const generateRedisKeyFromAccountToEntity = (
  entityId: string,
  entityType: EntityType,
  tenantId: string,
  isRegular?: boolean,
) =>
  `accountByEntity:${tenantId}:${entityType}:${entityId}${
    isRegular ? ':regular' : ':reserves'
  }`;
