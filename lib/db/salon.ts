import type { PoolClient } from 'pg';
import { withPgClient } from '@/lib/db/pool';

export async function getDefaultSalonId(client: PoolClient): Promise<string> {
  const r = await client.query<{ id: string }>(
    `SELECT id FROM salons WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1`
  );
  const id = r.rows[0]?.id;
  if (!id) throw new Error('No salon row in database');
  return id;
}

export async function resolveDefaultSalonId(): Promise<string> {
  return withPgClient((client) => getDefaultSalonId(client));
}
