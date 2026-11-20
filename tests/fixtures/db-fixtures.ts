import type { AnyRecord } from '../../src/storage/records';

/**
 * Data as each database version saved it. The upgrade test writes `seed` with that version of
 * the schema, opens the database with the current schema, and expects `expected` (or `seed`,
 * if nothing should change).
 *
 * Add an entry for every new entry in SCHEMA_HISTORY. Never change an existing entry.
 */
export const DB_FIXTURES: Record<
  number,
  { seed: Record<string, AnyRecord[]>; expected?: Record<string, AnyRecord[]> }
> = {
  1: {
    seed: {
      settings: [{ id: 'prefs', createdAt: 1763640000000, updatedAt: 1763640000000, terms: 'uk' }],
      charts: [
        { id: 'c1', createdAt: 1763640000000, updatedAt: 1763640000500, name: 'Heart' },
        { id: 'c2', createdAt: 1763640000000, updatedAt: 1763640000900, deletedAt: 1763640000900, name: 'Old' },
      ],
      designs: [],
      portfolio: [],
    },
  },
};
