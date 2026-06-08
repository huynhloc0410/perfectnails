import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { compactLegacyId } from '@/lib/db/legacyId';

export async function getMappedUuid(
  client: PoolClient,
  entityType: string,
  legacyId: string
): Promise<string | null> {
  const key = compactLegacyId(legacyId);
  const r = await client.query<{ uuid: string }>(
    `SELECT uuid FROM legacy_id_mappings WHERE entity_type = $1 AND legacy_id = $2`,
    [entityType, key]
  );
  return r.rows[0]?.uuid ?? null;
}

export async function rememberMapping(
  client: PoolClient,
  entityType: string,
  legacyId: string,
  uuid: string
): Promise<void> {
  const key = compactLegacyId(legacyId);
  await client.query(
    `INSERT INTO legacy_id_mappings (entity_type, legacy_id, uuid)
     VALUES ($1, $2, $3)
     ON CONFLICT (entity_type, legacy_id) DO UPDATE SET uuid = EXCLUDED.uuid`,
    [entityType, key, uuid]
  );
}

export async function mappedOrNew(
  client: PoolClient,
  entityType: string,
  legacyId: string
): Promise<string> {
  const existing = await getMappedUuid(client, entityType, legacyId);
  if (existing) return existing;
  const uuid = randomUUID();
  await rememberMapping(client, entityType, legacyId, uuid);
  return uuid;
}
