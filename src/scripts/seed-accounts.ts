import { seedAccounts } from 'src/account/seeds';
import { AppDataSource } from './data-source';

AppDataSource.initialize()
  .then(async () => {
    await seedAccounts(AppDataSource);
    console.log('✅ Seeding complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed', error);
    process.exit(1);
  });
