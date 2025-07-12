import { Account } from 'src/account/entity/account.entity';
import { EntityType } from '../enums/entity-type.enum';

export const getKeyForEntityFromAccountForRedis = (
  account: Account,
  tenantId: string,
) => {
  const key = `accountByEntity:${tenantId}:${account.entityType}:${account.entityId}:${
    account.pathName.includes('General Reserves') ? 'reserves' : 'regular'
  }`;
  return key;
};

export const getKeyForAccountFromEntityForRedis = (
  entityId: string,
  entityType: EntityType,
  tenantId: string,
  isRegular?: boolean,
) =>
  `accountByEntity:${tenantId}:${entityType}:${entityId}${
    isRegular ? ':regular' : ':reserves'
  }`;
