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
    '100000',
    AccountType.ACCOUNT_GROUP,
  );
  const liabilities = await createAccount(
    'Liabilities',
    '200000',
    AccountType.ACCOUNT_GROUP,
  );
  const revenue = await createAccount(
    'Revenue',
    '300000',
    AccountType.ACCOUNT_GROUP,
  );
  const assets = await createAccount(
    'Assets',
    '400000',
    AccountType.ACCOUNT_GROUP,
  );
  const expenses = await createAccount(
    'Expenses',
    '500000',
    AccountType.ACCOUNT_GROUP,
  );

  // Level 2: ACCOUNT_TYPE
  const generalReserves = await createAccount(
    'General Reserves',
    '110000',
    AccountType.ACCOUNT_TYPE,
    equity,
  );
  const profitAccount = await createAccount(
    'Profit Account',
    '120000',
    AccountType.ACCOUNT_TYPE,
    equity,
  );
  const partnerShare = await createAccount(
    'Partner Share',
    '130000',
    AccountType.ACCOUNT_TYPE,
    equity,
  );

  const currentLiabilities = await createAccount(
    'Current Liabilities',
    '210000',
    AccountType.ACCOUNT_TYPE,
    liabilities,
  );
  const nonCurrentLiabilities = await createAccount(
    'Non-Current Liabilities',
    '220000',
    AccountType.ACCOUNT_TYPE,
    liabilities,
  );

  const tradeRevenue = await createAccount(
    'Trade Revenue',
    '310000',
    AccountType.ACCOUNT_TYPE,
    revenue,
  );
  const otherIncome = await createAccount(
    'Other Income',
    '320000',
    AccountType.ACCOUNT_TYPE,
    revenue,
  );

  const currentAssets = await createAccount(
    'Current Assets',
    '410000',
    AccountType.ACCOUNT_TYPE,
    assets,
  );
  const nonCurrentAssets = await createAccount(
    'Non-Current Assets',
    '420000',
    AccountType.ACCOUNT_TYPE,
    assets,
  );

  const operatingExpenses = await createAccount(
    'Operating Expenses',
    '510000',
    AccountType.ACCOUNT_TYPE,
    expenses,
  );
  const nonOperatingExpenses = await createAccount(
    'Non-operating Expenses',
    '520000',
    AccountType.ACCOUNT_TYPE,
    expenses,
  );
  const otherExpenses = await createAccount(
    'Other Expenses',
    '530000',
    AccountType.ACCOUNT_TYPE,
    expenses,
  );

  // Level 3: ACCOUNT
  // Under Current Assets
  await createAccount(
    'Cash & Bank',
    '411000',
    AccountType.ACCOUNT,
    currentAssets,
  );
  await createAccount(
    'Stock In Hand',
    '412000',
    AccountType.ACCOUNT,
    currentAssets,
  );
  await createAccount(
    'Trade Receivables',
    '413000',
    AccountType.ACCOUNT,
    currentAssets,
  );

  // Under Non-Current Assets
  await createAccount('Land', '421000', AccountType.ACCOUNT, nonCurrentAssets);
  await createAccount(
    'Building',
    '422000',
    AccountType.ACCOUNT,
    nonCurrentAssets,
  );
  await createAccount(
    'Machinery',
    '423000',
    AccountType.ACCOUNT,
    nonCurrentAssets,
  );
  await createAccount(
    'Long-Term Investments',
    '424000',
    AccountType.ACCOUNT,
    nonCurrentAssets,
  );

  // Under General Reserves
  await createAccount(
    'Bank Openings',
    '111000',
    AccountType.ACCOUNT,
    generalReserves,
  );
  await createAccount(
    'Customer Openings',
    '112000',
    AccountType.ACCOUNT,
    generalReserves,
  );
  await createAccount(
    'Stock Openings',
    '113000',
    AccountType.ACCOUNT,
    generalReserves,
  );
  await createAccount(
    'Supplier Openings',
    '114000',
    AccountType.ACCOUNT,
    generalReserves,
  );

  // Under Current Liabilities
  await createAccount(
    'Trade Payables',
    '211000',
    AccountType.ACCOUNT,
    currentLiabilities,
  );
  await createAccount(
    'Short-term Loan',
    '212000',
    AccountType.ACCOUNT,
    currentLiabilities,
  );
  await createAccount(
    'Salaries Payable',
    '213000',
    AccountType.ACCOUNT,
    currentLiabilities,
  );
  const taxPayables = await createAccount(
    'Taxes Payable',
    '214000',
    AccountType.ACCOUNT,
    currentLiabilities,
  );

  // Under Non-Current Liabilities
  await createAccount(
    'Long-term Loans',
    '221000',
    AccountType.ACCOUNT,
    nonCurrentLiabilities,
  );
  await createAccount(
    'Long-term Leases',
    '222000',
    AccountType.ACCOUNT,
    nonCurrentLiabilities,
  );

  await createAccount(
    'General Sales Tax',
    '214100',
    AccountType.SUB_ACCOUNT,
    taxPayables,
  );

  const discount = await createAccount(
    'Discount',
    '330000',
    AccountType.ACCOUNT_TYPE,
    revenue,
  );

  const discountAllowed = await createAccount(
    'Discount Allowed',
    '331000',
    AccountType.ACCOUNT,
    discount,
  );

  await createAccount(
    'Discount on Invoice',
    '331100',
    AccountType.SUB_ACCOUNT,
    discountAllowed,
  );

  const costOfSales = await createAccount(
    'Cost of Sales',
    '511000',
    AccountType.ACCOUNT,
    operatingExpenses,
  );

  await createAccount(
    'Cost from Product Sale',
    '511100',
    AccountType.SUB_ACCOUNT,
    costOfSales,
  );

  const sales = await createAccount(
    'Sales',
    '311000',
    AccountType.ACCOUNT,
    tradeRevenue,
  );

  await createAccount(
    'Sales of Product Income',
    '311100',
    AccountType.SUB_ACCOUNT,
    sales,
  );
  console.log('✅ Account chart of accounts seeded.');
};
