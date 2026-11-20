import { BACKUP_STORES, STORE_LABELS, db, type BackupStore } from './db';
import { isRecord, type AnyRecord } from './records';

/**
 * Backup files: everything you've made, as one JSON file.
 *
 * Importing never deletes anything. Each item is matched by id:
 *  - not on this device yet: it's added;
 *  - newer in the file (larger `updatedAt`): the file's version replaces this device's;
 *  - the same or older in the file: this device's version is kept.
 * Items deleted on the other device arrive with `deletedAt` set, so they move to the Trash here
 * (and can be restored) rather than disappearing.
 *
 * When the shape of saved data changes, raise BACKUP_FORMAT, add a migration below, and add
 * `tests/fixtures/backup-format-<n>.json`. Older backup files must always keep importing.
 */

export const BACKUP_APP = 'crochet-studio';
export const BACKUP_FORMAT = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  format: number;
  exportedAt: string;
  appVersion: string;
  stores: Partial<Record<BackupStore, AnyRecord[]>>;
}

type RawBackup = Record<string, unknown> & { format: number; stores: Record<string, unknown> };

/** Upgrades a backup from format `n` to `n + 1`, keyed by `n`. */
const BACKUP_MIGRATIONS: Record<number, (b: RawBackup) => RawBackup> = {};

/** An error whose message can be shown to the user as it is. */
export class BackupError extends Error {
  override name = 'BackupError';
}

export async function createBackup(appVersion: string, now: Date = new Date()): Promise<BackupFile> {
  const tables = BACKUP_STORES.map((s) => db.store(s));
  const stores = await db.transaction('r', tables, async () => {
    const out: Partial<Record<BackupStore, AnyRecord[]>> = {};
    for (const s of BACKUP_STORES) out[s] = await db.store(s).toArray();
    return out;
  });
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: now.toISOString(), appVersion, stores };
}

export function serializeBackup(b: BackupFile): string {
  return JSON.stringify(b, null, 1);
}

export function backupFileName(when: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `crochet-studio-backup-${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(when.getDate())}.json`;
}

const NOT_A_BACKUP = "This file isn't a Crochet Studio backup.";

/** Reads a backup file's text, upgrading older formats. Throws BackupError with a readable message. */
export function readBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError(NOT_A_BACKUP);
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new BackupError(NOT_A_BACKUP);
  const raw = data as Record<string, unknown>;

  if (raw.app === 'tapestry-chart-tracker') {
    throw new BackupError(
      'This is a project file from the Tapestry Chart Tracker, not a backup. ' +
        'Chart files will open in the Charts tab once it is built.',
    );
  }
  if (raw.app !== BACKUP_APP) throw new BackupError(NOT_A_BACKUP);

  const format = raw.format;
  if (typeof format !== 'number' || !Number.isInteger(format) || format < 1) {
    throw new BackupError('The backup file is damaged: its format number is missing.');
  }
  if (format > BACKUP_FORMAT) {
    throw new BackupError(
      'This backup was made by a newer version of Crochet Studio. ' +
        'Reload the app to update it, then import the file again.',
    );
  }
  if (typeof raw.stores !== 'object' || raw.stores === null || Array.isArray(raw.stores)) {
    throw new BackupError('The backup file is damaged: it has no saved data in it.');
  }

  let b = raw as RawBackup;
  for (let f = format; f < BACKUP_FORMAT; f++) {
    const migrate = BACKUP_MIGRATIONS[f];
    if (!migrate) throw new Error(`Missing backup migration from format ${f}`);
    b = { ...migrate(b), format: f + 1 };
  }

  const known = new Set<string>(BACKUP_STORES);
  const unknown = Object.keys(b.stores).filter((s) => !known.has(s));
  if (unknown.length) {
    throw new BackupError(
      `This backup has kinds of data this version of the app doesn't know yet (${unknown.join(', ')}). ` +
        'Reload the app to update it, then import the file again.',
    );
  }

  const stores: Partial<Record<BackupStore, AnyRecord[]>> = {};
  for (const s of BACKUP_STORES) {
    const list = b.stores[s];
    if (list === undefined) continue;
    if (!Array.isArray(list) || !list.every(isRecord)) {
      throw new BackupError(`The backup file is damaged: something in ${STORE_LABELS[s]} is missing its id or dates.`);
    }
    stores[s] = list;
  }

  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : '',
    appVersion: typeof b.appVersion === 'string' ? b.appVersion : '',
    stores,
  };
}

export interface MergeCounts {
  /** Not on this device yet. */
  added: number;
  /** Newer in the file, so the file's version replaces this device's. */
  updated: number;
  /** Of the updated ones: deleted on the other device, so they move to the Trash here. */
  toTrash: number;
  /** The same or newer on this device, so nothing changes. */
  kept: number;
}

const zero = (): MergeCounts => ({ added: 0, updated: 0, toTrash: 0, kept: 0 });

/** Decides what an import writes for one store. Pure: doesn't touch the database. */
export function mergeRecords(
  local: ReadonlyMap<string, AnyRecord>,
  incoming: readonly AnyRecord[],
): { write: AnyRecord[]; counts: MergeCounts } {
  // If the file has the same id twice, the newest copy counts.
  const newest = new Map<string, AnyRecord>();
  for (const r of incoming) {
    const seen = newest.get(r.id);
    if (!seen || r.updatedAt > seen.updatedAt) newest.set(r.id, r);
  }
  const counts = zero();
  const write: AnyRecord[] = [];
  for (const r of newest.values()) {
    const mine = local.get(r.id);
    if (!mine) {
      counts.added++;
      write.push(r);
    } else if (r.updatedAt > mine.updatedAt) {
      counts.updated++;
      if (r.deletedAt && !mine.deletedAt) counts.toTrash++;
      write.push(r);
    } else {
      counts.kept++;
    }
  }
  return { write, counts };
}

export interface ImportResult {
  stores: Partial<Record<BackupStore, MergeCounts>>;
  total: MergeCounts;
}

async function mergeAll(file: BackupFile, apply: boolean): Promise<ImportResult> {
  const tables = BACKUP_STORES.map((s) => db.store(s));
  return db.transaction(apply ? 'rw' : 'r', tables, async () => {
    const result: ImportResult = { stores: {}, total: zero() };
    for (const s of BACKUP_STORES) {
      const incoming = file.stores[s];
      if (!incoming?.length) continue;
      const table = db.store(s);
      const existing = await table.bulkGet(incoming.map((r) => r.id));
      const local = new Map<string, AnyRecord>();
      for (const r of existing) if (r) local.set(r.id, r);
      const { write, counts } = mergeRecords(local, incoming);
      if (apply && write.length) await table.bulkPut(write);
      result.stores[s] = counts;
      for (const k of Object.keys(counts) as (keyof MergeCounts)[]) result.total[k] += counts[k];
    }
    return result;
  });
}

/** What importing this file would change, without changing anything. */
export function previewImport(file: BackupFile): Promise<ImportResult> {
  return mergeAll(file, false);
}

/** Imports the file in one step: either everything is saved or nothing is. */
export function applyImport(file: BackupFile): Promise<ImportResult> {
  return mergeAll(file, true);
}
