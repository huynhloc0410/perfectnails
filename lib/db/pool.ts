import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { databaseUrlFromEnv, isDatabaseConfigured, pgSslOption } from '@/lib/db/config';

let pool: Pool | null = null;

export function getPgPool(): Pool {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrlFromEnv(),
      ssl: pgSslOption(),
      max: 10,
    });
  }
  return pool;
}

export async function withPgClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPgPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function pgQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await getPgPool().query<T>(text, params);
  return res.rows;
}

export async function disconnectPgPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
