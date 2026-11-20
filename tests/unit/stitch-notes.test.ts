import { beforeEach, expect, test } from 'vitest';
import { getNote, safeLink, saveNote, stitchesWithNotes } from '../../src/stitches/notes';
import { applyImport, createBackup, readBackup, serializeBackup } from '../../src/storage/backup';
import { db } from '../../src/storage/db';
import { clearDb } from './helpers';

beforeEach(clearDb);

test('a stitch has no note until one is written', async () => {
  expect(await getNote('moss')).toEqual({ text: '', link: '' });
  await saveNote('moss', { text: '', link: '' });
  expect(await db.stitchNotes.count()).toBe(0);
});

test('a note is saved under the stitch id and moves updatedAt forward', async () => {
  await saveNote('moss', { text: 'Change color every 2 rows', link: '' });
  const first = await db.stitchNotes.get('moss');
  await saveNote('moss', { text: 'Change color every 2 rows', link: 'https://example.com/moss' });
  const second = await db.stitchNotes.get('moss');
  expect(await getNote('moss')).toEqual({ text: 'Change color every 2 rows', link: 'https://example.com/moss' });
  expect(second!.createdAt).toBe(first!.createdAt);
  expect(second!.updatedAt).toBeGreaterThan(first!.updatedAt);
  expect(await stitchesWithNotes()).toEqual(new Set(['moss']));
});

test('notes travel in backups', async () => {
  await saveNote('shell', { text: 'Count to 5 every time', link: '' });
  const text = serializeBackup(await createBackup('x'));
  expect(JSON.parse(text).stores.stitchNotes).toHaveLength(1);
  await clearDb();
  const result = await applyImport(readBackup(text));
  expect(result.stores.stitchNotes).toMatchObject({ added: 1 });
  expect((await getNote('shell')).text).toBe('Count to 5 every time');
});

test('only web addresses become links', () => {
  expect(safeLink('https://www.youtube.com/watch?v=abc')).toBe('https://www.youtube.com/watch?v=abc');
  expect(safeLink('javascript:alert(1)')).toBeNull();
  expect(safeLink('not a link')).toBeNull();
});
