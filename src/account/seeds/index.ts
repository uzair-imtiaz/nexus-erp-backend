import { DataSource } from 'typeorm';
import { Account } from 'src/account/entity/account.entity';
import { AccountType } from 'src/account/interfaces/account-type.enum';

export const seedAccounts = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(Account);

  const createAccount = async (
    name: string,
    code: string,
    type: AccountType,
    parent?: Account,
  ) => {
    const account = repo.create({
      name,
      code,
      type,
      parent,
      systemGenerated: true,
      amount: 0,
    });
    return repo.save(account);
  };

  // Level 1: ACCOUNT_GROUP
  const equity = await createAccount(
    'Equity',
    '1000',
    AccountType.ACCOUNT_GROUP,
  );
  const liabilities = await createAccount(
    'Liabilities',
    '2000',
    AccountType.ACCOUNT_GROUP,
  );
  const revenue = await createAccount(
    'Revenue',
    '3000',
    AccountType.ACCOUNT_GROUP,
  );
  const assets = await createAccount(
    'Assets',
    '4000',
    AccountType.ACCOUNT_GROUP,
  );
  const expenses = await createAccount(
    'Expenses',
    '5000',
    AccountType.ACCOUNT_GROUP,
  );

  // Level 2: ACCOUNT_TYPE
  const generalReserves = await createAccount(
    'General Reserves',
    '1100',
    AccountType.ACCOUNT_TYPE,
    equity,
  );
  const profitAccount = await createAccount(
    'Profit Account',
    '1200',
    AccountType.ACCOUNT_TYPE,
    equity,
  );
  const partnerShare = await createAccount(
    'Partner Share',
    '1300',
    AccountType.ACCOUNT_TYPE,
    equity,
  );

  const currentLiabilities = await createAccount(
    'Current Liabilities',
    '2100',
    AccountType.ACCOUNT_TYPE,
    liabilities,
  );
  const nonCurrentLiabilities = await createAccount(
    'Non-Current Liabilities',
    '2200',
    AccountType.ACCOUNT_TYPE,
    liabilities,
  );

  const tradeRevenue = await createAccount(
    'Trade Revenue',
    '3100',
    AccountType.ACCOUNT_TYPE,
    revenue,
  );
  const otherIncome = await createAccount(
    'Other Income',
    '3200',
    AccountType.ACCOUNT_TYPE,
    revenue,
  );

  const currentAssets = await createAccount(
    'Current Assets',
    '4100',
    AccountType.ACCOUNT_TYPE,
    assets,
  );
  const nonCurrentAssets = await createAccount(
    'Non-Current Assets',
    '4200',
    AccountType.ACCOUNT_TYPE,
    assets,
  );

  const operatingExpenses = await createAccount(
    'Operating Expenses',
    '5100',
    AccountType.ACCOUNT_TYPE,
    expenses,
  );
  const nonOperatingExpenses = await createAccount(
    'Non-operating Expenses',
    '5200',
    AccountType.ACCOUNT_TYPE,
    expenses,
  );
  const otherExpenses = await createAccount(
    'Other Expenses',
    '5300',
    AccountType.ACCOUNT_TYPE,
    expenses,
  );

  // Level 3: ACCOUNT
  // Under Current Assets
  await createAccount(
    'Cash & Bank',
    '4110',
    AccountType.ACCOUNT,
    currentAssets,
  );
  await createAccount(
    'Stock In Hand',
    '4120',
    AccountType.ACCOUNT,
    currentAssets,
  );
  await createAccount(
    'Trade Receivables',
    '4130',
    AccountType.ACCOUNT,
    currentAssets,
  );

  // Under Non-Current Assets
  await createAccount('Land', '4210', AccountType.ACCOUNT, nonCurrentAssets);
  await createAccount(
    'Building',
    '4220',
    AccountType.ACCOUNT,
    nonCurrentAssets,
  );
  await createAccount(
    'Machinery',
    '4230',
    AccountType.ACCOUNT,
    nonCurrentAssets,
  );
  await createAccount(
    'Long-Term Investments',
    '4240',
    AccountType.ACCOUNT,
    nonCurrentAssets,
  );

  // Under General Reserves
  await createAccount(
    'Bank Openings',
    '1110',
    AccountType.ACCOUNT,
    generalReserves,
  );
  await createAccount(
    'Customer Openings',
    '1120',
    AccountType.ACCOUNT,
    generalReserves,
  );
  await createAccount(
    'Stock Openings',
    '1130',
    AccountType.ACCOUNT,
    generalReserves,
  );
  await createAccount(
    'Supplier Openings',
    '1140',
    AccountType.ACCOUNT,
    generalReserves,
  );

  // Under Current Liabilities
  await createAccount(
    'Trade Payables',
    '2110',
    AccountType.ACCOUNT,
    currentLiabilities,
  );
  await createAccount(
    'Short-term Loan',
    '2120',
    AccountType.ACCOUNT,
    currentLiabilities,
  );
  await createAccount(
    'Salaries Payable',
    '2130',
    AccountType.ACCOUNT,
    currentLiabilities,
  );
  await createAccount(
    'Taxes Payable',
    '2140',
    AccountType.ACCOUNT,
    currentLiabilities,
  );

  // Under Non-Current Liabilities
  await createAccount(
    'Long-term Loans',
    '2210',
    AccountType.ACCOUNT,
    nonCurrentLiabilities,
  );
  await createAccount(
    'Long-term Leases',
    '2220',
    AccountType.ACCOUNT,
    nonCurrentLiabilities,
  );

  console.log('✅ Account chart of accounts seeded.');
};
