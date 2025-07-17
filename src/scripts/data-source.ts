import 'dotenv/config'; // so env vars load
import { DataSource } from 'typeorm';
import { Account } from 'src/account/entity/account.entity';
import { Tenant } from 'src/tenant/entity/tenant.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: true,
  entities: [Account, Tenant],
  ssl: false, // or your actual ssl config
});
