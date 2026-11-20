import { db } from '../../src/storage/db';
import type { AnyRecord } from '../../src/storage/records';

export async function clearDb(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()));
}

export async function dumpDb(): Promise<Record<string, AnyRecord[]>> {
  const out: Record<string, AnyRecord[]> = {};
  for (const t of db.tables) out[t.name] = (await t.toArray()).sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

export function rec(id: string, updatedAt: number, extra: Record<string, unknown> = {}): AnyRecord {
  return { id, createdAt: 1, updatedAt, ...extra };
}
