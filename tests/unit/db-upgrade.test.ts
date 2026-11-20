import Dexie from 'dexie';
import { describe, expect, test } from 'vitest';
import { BACKUP_STORES, CrochetDB, SCHEMA_HISTORY } from '../../src/storage/db';
import { DB_FIXTURES } from '../fixtures/db-fixtures';

describe('saved data survives every database upgrade', () => {
  test('versions only go up', () => {
    const versions = SCHEMA_HISTORY.map((v) => v.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
  });

  test('every database version has a fixture', () => {
    for (const v of SCHEMA_HISTORY) expect(DB_FIXTURES[v.version], `fixture for version ${v.version}`).toBeDefined();
  });

  test('every backup store exists in the current database', () => {
    const current = new CrochetDB('store-check');
    expect(current.tables.map((t) => t.name).sort()).toEqual(expect.arrayContaining([...BACKUP_STORES].sort()));
  });

  for (const v of SCHEMA_HISTORY) {
    test(`data saved by database version ${v.version} is still readable`, async () => {
      const fixture = DB_FIXTURES[v.version]!;
      const name = `upgrade-test-v${v.version}`;
      await Dexie.delete(name);

      const old = new CrochetDB(name, v.version);
      await old.open();
      for (const [store, records] of Object.entries(fixture.seed)) await old.table(store).bulkPut(records);
      old.close();

      const current = new CrochetDB(name);
      await current.open();
      const expected = fixture.expected ?? fixture.seed;
      for (const [store, records] of Object.entries(expected)) {
        const saved = await current.table(store).toArray();
        expect(saved.sort((a, b) => a.id.localeCompare(b.id)), store).toEqual(
          [...records].sort((a, b) => a.id.localeCompare(b.id)),
        );
      }
      current.close();
      await Dexie.delete(name);
    });
  }
});
