import { CONTENT_STORES, db, type ContentStore } from './db';
import { newId } from './ids';
import { nextStamp, type AnyRecord } from './records';

/**
 * Saving, trashing and restoring items in the content stores (charts, designs, portfolio).
 * Each phase adds typed helpers on top of these.
 */

export async function createItem(
  store: ContentStore,
  fields: Record<string, unknown> & { id?: string },
): Promise<AnyRecord> {
  const now = nextStamp();
  const record: AnyRecord = { ...fields, id: fields.id ?? newId(), createdAt: now, updatedAt: now };
  delete record.deletedAt;
  await db.store(store).add(record);
  return record;
}

/** Changes some fields of an item. Returns the saved item, or undefined if it doesn't exist. */
export async function updateItem(
  store: ContentStore,
  id: string,
  changes: Record<string, unknown>,
): Promise<AnyRecord | undefined> {
  const table = db.store(store);
  return db.transaction('rw', table, async () => {
    const current = await table.get(id);
    if (!current) return undefined;
    const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...rest } = changes;
    const next: AnyRecord = { ...current, ...rest, updatedAt: nextStamp(current.updatedAt) };
    await table.put(next);
    return next;
  });
}

export async function getItem(store: ContentStore, id: string): Promise<AnyRecord | undefined> {
  const r = await db.store(store).get(id);
  return r && !r.deletedAt ? r : undefined;
}

/** Items that are not in the Trash, newest change first. */
export async function listItems(store: ContentStore): Promise<AnyRecord[]> {
  const all = await db.store(store).filter((r) => !r.deletedAt).toArray();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function moveToTrash(store: ContentStore, id: string): Promise<void> {
  const table = db.store(store);
  await db.transaction('rw', table, async () => {
    const current = await table.get(id);
    if (!current || current.deletedAt) return;
    const now = nextStamp(current.updatedAt);
    await table.put({ ...current, deletedAt: now, updatedAt: now });
  });
}

export async function restoreFromTrash(store: ContentStore, id: string): Promise<void> {
  const table = db.store(store);
  await db.transaction('rw', table, async () => {
    const current = await table.get(id);
    if (!current || !current.deletedAt) return;
    const { deletedAt: _d, ...rest } = current;
    await table.put({ ...rest, updatedAt: nextStamp(current.updatedAt) });
  });
}

export interface TrashItem {
  store: ContentStore;
  id: string;
  name: string;
  deletedAt: number;
}

/** A readable name for any item, whatever store it's from. */
export function itemName(r: AnyRecord): string {
  for (const key of ['name', 'title']) {
    const v = r[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return 'Untitled';
}

export async function listTrash(): Promise<TrashItem[]> {
  const items: TrashItem[] = [];
  for (const store of CONTENT_STORES) {
    const trashed = await db.store(store).where('deletedAt').above(0).toArray();
    for (const r of trashed) items.push({ store, id: r.id, name: itemName(r), deletedAt: r.deletedAt! });
  }
  return items.sort((a, b) => b.deletedAt - a.deletedAt);
}

/** Removes one item from the Trash for good. Items outside the Trash are never touched. */
export async function deleteForever(store: ContentStore, id: string): Promise<void> {
  const table = db.store(store);
  await db.transaction('rw', table, async () => {
    const current = await table.get(id);
    if (current?.deletedAt) await table.delete(id);
  });
}

/** Removes everything in the Trash for good. Returns how many items were removed. */
export async function emptyTrash(): Promise<number> {
  const tables = CONTENT_STORES.map((s) => db.store(s));
  return db.transaction('rw', tables, async () => {
    let n = 0;
    for (const t of tables) n += await t.where('deletedAt').above(0).delete();
    return n;
  });
}

/** How many items (not in the Trash) the user has made. */
export async function countItems(): Promise<number> {
  let n = 0;
  for (const store of CONTENT_STORES) n += await db.store(store).filter((r) => !r.deletedAt).count();
  return n;
}
