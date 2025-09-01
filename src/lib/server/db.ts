import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { cookies } from 'next/headers';

export interface Database {
  [key: string]: unknown;
}

async function getDatabaseUrl(): Promise<string | undefined> {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (!process.env.IS_CLI) {
    try {
      const cookieStore = await cookies();
      const databaseUrlCookie = cookieStore.get('database_url');
      if (databaseUrlCookie?.value) {
        return databaseUrlCookie.value;
      }
    } catch (error) {
      console.warn('Could not access cookies:', error);
    }
  }

  return undefined;
}

export async function getDb(): Promise<Kysely<Database> | null> {
  const databaseUrl = await getDatabaseUrl();

  if (!databaseUrl) {
    return null;
  }

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: databaseUrl,
      }),
    }),
  });
}
