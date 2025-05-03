import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['dist/**/**.entity{.ts,.js}'],
  bigNumberStrings: false,
  synchronize: process.env.NODE_ENV === 'development',
  autoLoadEntities: true,
  logging: false,
  ssl: {
    rejectUnauthorized: false,
  },
}));
