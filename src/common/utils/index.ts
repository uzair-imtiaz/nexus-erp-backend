import { Account } from 'src/account/entity/account.entity';

export const getKeyForRedis = (account: Account, tenantId: string) => {
  const key = `accountByEntity:${tenantId}:${account.entityType}:${account.entityId}:${
    account.pathName.includes('General Reserves') ? 'reserves' : 'regular'
  }`;
  return key;
};
