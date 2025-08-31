import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';

interface Database {}

const url = new URL(process.env.DATABASE_URL as string);

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: url.host,
      user: url.username,
      password: url.password,
      database: url.pathname,
    }),
  }),
});
