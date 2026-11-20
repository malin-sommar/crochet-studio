import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  BACKUP_FORMAT,
  BackupError,
  applyImport,
  backupFileName,
  createBackup,
  mergeRecords,
  previewImport,
  readBackup,
  serializeBackup,
} from '../../src/storage/backup';
import { createItem, moveToTrash, updateItem } from '../../src/storage/content';
import { db } from '../../src/storage/db';
import { getPrefs, setPrefs } from '../../src/storage/prefs';
import type { AnyRecord } from '../../src/storage/records';
import { clearDb, dumpDb, rec } from './helpers';

beforeEach(clearDb);

async function makeSomeData() {
  await setPrefs({ terms: 'uk' });
  const heart = await createItem('charts', { name: 'Heart', cells: ['010', '111'] });
  const old = await createItem('charts', { name: 'Old chart' });
  await moveToTrash('charts', old.id);
  await createItem('designs', { name: 'Moss scarf' });
  await createItem('portfolio', { title: 'Blanket for Mum', status: 'finished' });
  return { heart, old };
}

describe('saving a backup', () => {
  test('includes every store, including items in the Trash', async () => {
    await makeSomeData();
    const b = await createBackup('9.9.9', new Date('2026-11-20T10:00:00Z'));
    expect(b).toMatchObject({ app: 'crochet-studio', format: BACKUP_FORMAT, appVersion: '9.9.9' });
    expect(b.exportedAt).toBe('2026-11-20T10:00:00.000Z');
    expect(b.stores.settings).toHaveLength(1);
    expect(b.stores.charts).toHaveLength(2);
    expect(b.stores.charts!.some((r) => r.deletedAt)).toBe(true);
    expect(b.stores.designs).toHaveLength(1);
    expect(b.stores.portfolio).toHaveLength(1);
  });

  test('file name has the date', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('crochet-studio-backup-2026-01-05.json');
  });

  test('restoring a backup on an empty device brings back exactly the same data', async () => {
    await makeSomeData();
    const before = await dumpDb();
    const text = serializeBackup(await createBackup('0.1.0'));

    await clearDb();
    const result = await applyImport(readBackup(text));

    expect(await dumpDb()).toEqual(before);
    expect(result.total).toEqual({ added: 5, updated: 0, toTrash: 0, kept: 0 });
    expect(await getPrefs()).toEqual({ terms: 'uk' });
  });
});

describe('reading a backup file', () => {
  const valid = { app: 'crochet-studio', format: 1, exportedAt: '', appVersion: '', stores: {} };
  const bad = (v: unknown) => () => readBackup(typeof v === 'string' ? v : JSON.stringify(v));

  test('accepts a valid file', () => {
    expect(readBackup(JSON.stringify(valid))).toMatchObject({ app: 'crochet-studio', format: 1 });
  });

  test.each([
    ['text that is not JSON', 'hello'],
    ['JSON that is not an object', '[1,2]'],
    ['a file from another app', { app: 'something-else', format: 1, stores: {} }],
  ])('rejects %s', (_label, v) => {
    expect(bad(v)).toThrow(BackupError);
    expect(bad(v)).toThrow("isn't a Crochet Studio backup");
  });

  test('explains that a tracker project file is not a backup', () => {
    expect(bad({ app: 'tapestry-chart-tracker', version: 2, project: {} })).toThrow('Tapestry Chart Tracker');
  });

  test('asks to update the app for a newer format', () => {
    expect(bad({ ...valid, format: BACKUP_FORMAT + 1 })).toThrow('newer version');
  });

  test('refuses data it does not know instead of silently dropping it', () => {
    expect(bad({ ...valid, stores: { stash: [rec('y1', 1)] } })).toThrow(/doesn't know yet \(stash\)/);
  });

  test.each([
    ['no format', { ...valid, format: undefined }],
    ['no stores', { ...valid, stores: undefined }],
    ['a store that is not a list', { ...valid, stores: { charts: {} } }],
    ['a record without an id', { ...valid, stores: { charts: [{ createdAt: 1, updatedAt: 1 }] } }],
  ])('rejects a damaged file: %s', (_label, v) => {
    expect(bad(v)).toThrow(BackupError);
  });

  // Old backup files must keep working forever. Add a fixture whenever BACKUP_FORMAT goes up.
  for (let format = 1; format <= BACKUP_FORMAT; format++) {
    test(`a format ${format} backup still imports`, async () => {
      const text = readFileSync(new URL(`../fixtures/backup-format-${format}.json`, import.meta.url), 'utf8');
      const file = readBackup(text);
      await applyImport(file);
      expect(file.format).toBe(BACKUP_FORMAT);
      expect(await db.settings.count()).toBeGreaterThan(0);
    });
  }
});

describe('merging rules', () => {
  const local = (records: AnyRecord[]) => new Map(records.map((r) => [r.id, r]));

  test('adds new items, takes newer ones, keeps the same or older ones', () => {
    const { write, counts } = mergeRecords(local([rec('a', 10), rec('b', 10), rec('c', 10)]), [
      rec('a', 20, { v: 'newer' }),
      rec('b', 10, { v: 'same' }),
      rec('c', 5, { v: 'older' }),
      rec('d', 1, { v: 'new' }),
    ]);
    expect(write.map((r) => r.v)).toEqual(['newer', 'new']);
    expect(counts).toEqual({ added: 1, updated: 1, toTrash: 0, kept: 2 });
  });

  test('an item deleted on the other device moves to the Trash here', () => {
    const { write, counts } = mergeRecords(local([rec('a', 10)]), [rec('a', 20, { deletedAt: 20 })]);
    expect(write[0]!.deletedAt).toBe(20);
    expect(counts.toTrash).toBe(1);
  });

  test('if the file has an id twice, the newest copy counts', () => {
    const { write } = mergeRecords(local([]), [rec('a', 5, { v: 1 }), rec('a', 9, { v: 2 }), rec('a', 7, { v: 3 })]);
    expect(write).toEqual([rec('a', 9, { v: 2 })]);
  });
});

describe('importing', () => {
  test('never deletes items that are not in the file', async () => {
    const mine = await createItem('charts', { name: 'Only on this device' });
    await applyImport(readBackup(serializeBackup({ ...(await createBackup('x')), stores: { charts: [] } })));
    expect(await db.charts.get(mine.id)).toEqual(mine);
  });

  test('keeps changes made here after the backup was saved', async () => {
    const { heart } = await makeSomeData();
    const text = serializeBackup(await createBackup('x'));
    await updateItem('charts', heart.id, { name: 'Heart, edited later' });

    const result = await applyImport(readBackup(text));
    expect((await db.charts.get(heart.id))!.name).toBe('Heart, edited later');
    expect(result.total.updated).toBe(0);
  });

  test('moving back and forth between two devices ends with the newest of everything', async () => {
    // Device A
    const { heart } = await makeSomeData();
    const fromA = serializeBackup(await createBackup('x'));

    // Device B: starts from A's backup, then edits the heart and adds a chart
    await clearDb();
    await applyImport(readBackup(fromA));
    await updateItem('charts', heart.id, { name: 'Heart v2' });
    const added = await createItem('charts', { name: 'Made on phone' });
    const fromB = serializeBackup(await createBackup('x'));
    const onB = await dumpDb();

    // Back on device A (simulated by restoring A's original state), import B's backup
    await clearDb();
    await applyImport(readBackup(fromA));
    const result = await applyImport(readBackup(fromB));

    expect(await dumpDb()).toEqual(onB);
    expect((await db.charts.get(added.id))!.name).toBe('Made on phone');
    expect(result.total).toMatchObject({ added: 1, updated: 1 });
  });

  test('previewing changes nothing', async () => {
    await makeSomeData();
    const file = readBackup(serializeBackup(await createBackup('x')));
    await clearDb();
    const preview = await previewImport(file);
    expect(preview.total.added).toBe(5);
    expect(preview.stores.charts).toEqual({ added: 2, updated: 0, toTrash: 0, kept: 0 });
    expect(await dumpDb()).toEqual({ settings: [], charts: [], designs: [], portfolio: [] });
  });

  test('importing the same file twice changes nothing the second time', async () => {
    await makeSomeData();
    const file = readBackup(serializeBackup(await createBackup('x')));
    await clearDb();
    await applyImport(file);
    const after = await dumpDb();
    const second = await applyImport(file);
    expect(second.total).toEqual({ added: 0, updated: 0, toTrash: 0, kept: 5 });
    expect(await dumpDb()).toEqual(after);
  });
});
