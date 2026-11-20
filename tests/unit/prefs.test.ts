import { beforeEach, expect, test } from 'vitest';
import { db } from '../../src/storage/db';
import { DEFAULT_PREFS, PREFS_ID, getPrefs, setPrefs } from '../../src/storage/prefs';
import { clearDb } from './helpers';

beforeEach(clearDb);

test('defaults to US terms before anything is saved', async () => {
  expect(await getPrefs()).toEqual(DEFAULT_PREFS);
  expect(DEFAULT_PREFS.terms).toBe('us');
});

test('saves a change and moves updatedAt forward', async () => {
  await setPrefs({ terms: 'uk' });
  const first = await db.settings.get(PREFS_ID);
  await setPrefs({ terms: 'sv' });
  const second = await db.settings.get(PREFS_ID);

  expect(await getPrefs()).toEqual({ terms: 'sv' });
  expect(second!.createdAt).toBe(first!.createdAt);
  expect(second!.updatedAt).toBeGreaterThan(first!.updatedAt);
});

test('an unknown saved value falls back to the default', async () => {
  await db.settings.put({ id: PREFS_ID, createdAt: 1, updatedAt: 1, terms: 'klingon' });
  expect(await getPrefs()).toEqual({ terms: 'us' });
});

test('keeps fields a newer version of the app may have saved', async () => {
  await db.settings.put({ id: PREFS_ID, createdAt: 1, updatedAt: 1, terms: 'us', units: 'cm' });
  await setPrefs({ terms: 'uk' });
  expect(await db.settings.get(PREFS_ID)).toMatchObject({ terms: 'uk', units: 'cm' });
});
