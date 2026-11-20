/**
 * Fields every saved record has, in every store.
 *
 * - `id` never changes, so the same item can be recognised on another device or in a backup.
 * - `updatedAt` moves forward on every change. When two copies of an item meet (importing a
 *   backup, or a future sync), the one with the larger `updatedAt` wins.
 * - `deletedAt` is set when an item goes to the Trash. Items are only removed for good when
 *   the Trash is emptied.
 */
export interface BaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/** A record whose own fields are defined by a later phase. */
export type AnyRecord = BaseRecord & Record<string, unknown>;

/** The next `updatedAt` for a record: now, but always later than the previous value. */
export function nextStamp(previous?: number, now: number = Date.now()): number {
  return previous === undefined ? now : Math.max(now, previous + 1);
}

export function isRecord(value: unknown): value is AnyRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    Number.isFinite(r.createdAt) &&
    Number.isFinite(r.updatedAt) &&
    (r.deletedAt === undefined || Number.isFinite(r.deletedAt))
  );
}
