import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';

interface Database {
  [key: string]: any;
}

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});
