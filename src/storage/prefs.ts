import { db } from './db';
import { nextStamp, type AnyRecord } from './records';

/** Which names stitches are shown with first. The others are shown next to them. */
export type Terms = 'us' | 'uk' | 'sv';

export const TERMS_LABELS: Record<Terms, string> = {
  us: 'US',
  uk: 'UK',
  sv: 'Swedish',
};

/**
 * Preferences that belong to you rather than to one device. They are saved with your work and
 * included in backups. (The theme is per device and lives in `device.ts`.)
 */
export interface Prefs {
  terms: Terms;
}

export const DEFAULT_PREFS: Prefs = { terms: 'us' };
export const PREFS_ID = 'prefs';

export function prefsFromRecord(r: AnyRecord | undefined): Prefs {
  const terms = r?.terms;
  return {
    terms: terms === 'us' || terms === 'uk' || terms === 'sv' ? terms : DEFAULT_PREFS.terms,
  };
}

export async function getPrefs(): Promise<Prefs> {
  return prefsFromRecord(await db.settings.get(PREFS_ID));
}

export async function setPrefs(changes: Partial<Prefs>): Promise<Prefs> {
  return db.transaction('rw', db.settings, async () => {
    const current = await db.settings.get(PREFS_ID);
    const now = nextStamp(current?.updatedAt);
    const next: AnyRecord = {
      ...current,
      ...prefsFromRecord(current),
      ...changes,
      id: PREFS_ID,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    await db.settings.put(next);
    return prefsFromRecord(next);
  });
}
