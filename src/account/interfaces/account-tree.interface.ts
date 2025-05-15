import { AccountType } from './account-type.enum';

export interface AccountTree {
  id: string;
  name: string;
  type: AccountType;
  code: string;
  amount: number;
  children: AccountTree[];
  parent_id: string;
}
