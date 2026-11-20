import Dexie, { type Table, type Transaction } from 'dexie';
import type { AnyRecord } from './records';

export const DB_NAME = 'crochet-studio';

export interface SchemaVersion {
  version: number;
  /** Dexie store definitions: primary key first, then indexed fields. `null` removes a store. */
  stores: Record<string, string | null>;
  /** Changes existing records to the new shape. Must keep every record readable. */
  upgrade?: (tx: Transaction) => Promise<void> | void;
}

const CONTENT_INDEXES = 'id, updatedAt, deletedAt';

/**
 * Every version the database has ever had, oldest first.
 *
 * Never edit or remove an entry once it has shipped: add a new one, with an `upgrade` when
 * existing records change shape, and add a fixture for it in `tests/fixtures/db-fixtures.ts`
 * (the upgrade test fails until you do).
 */
export const SCHEMA_HISTORY: readonly SchemaVersion[] = [
  {
    version: 1,
    stores: {
      // Shared preferences (one record, id "prefs"). Included in backups.
      settings: 'id',
      // Content stores. Their record shapes are defined in phases 2, 4 and 5.
      charts: CONTENT_INDEXES,
      designs: CONTENT_INDEXES,
      portfolio: CONTENT_INDEXES,
    },
  },
  {
    // Phase 3: your own notes and video link per stitch; the record id is the stitch id.
    // A new store only, so existing records don't change.
    version: 2,
    stores: { stitchNotes: 'id, updatedAt' },
  },
];

export const CURRENT_DB_VERSION = SCHEMA_HISTORY[SCHEMA_HISTORY.length - 1]!.version;

/** Stores that hold the user's work: they have a Trash and count as "something to back up". */
export const CONTENT_STORES = ['charts', 'designs', 'portfolio'] as const;
export type ContentStore = (typeof CONTENT_STORES)[number];

/** Every store that goes into a backup file. */
export const BACKUP_STORES = ['settings', ...CONTENT_STORES, 'stitchNotes'] as const;
export type BackupStore = (typeof BACKUP_STORES)[number];

export const STORE_LABELS: Record<BackupStore, string> = {
  settings: 'Settings',
  charts: 'Charts',
  designs: 'Designs',
  portfolio: 'Portfolio',
  stitchNotes: 'Stitch notes',
};

export class CrochetDB extends Dexie {
  settings!: Table<AnyRecord, string>;
  charts!: Table<AnyRecord, string>;
  designs!: Table<AnyRecord, string>;
  portfolio!: Table<AnyRecord, string>;
  stitchNotes!: Table<AnyRecord, string>;

  /** `upTo` opens the database as an older version of the app would (used by the upgrade test). */
  constructor(name: string = DB_NAME, upTo: number = Infinity) {
    super(name);
    for (const v of SCHEMA_HISTORY) {
      if (v.version > upTo) break;
      const step = this.version(v.version).stores(v.stores);
      if (v.upgrade) step.upgrade(v.upgrade);
    }
  }

  store(name: BackupStore): Table<AnyRecord, string> {
    return this.table(name);
  }
}

export const db = new CrochetDB();
