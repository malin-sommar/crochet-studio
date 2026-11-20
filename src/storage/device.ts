/**
 * Small conveniences that belong to this device only (theme, last open tab, when you last saved
 * a backup here). They live in localStorage, are not part of backups, and losing them is harmless.
 * Your actual work is stored in IndexedDB (see `db.ts`).
 */

const PREFIX = 'cs-';

export function readDevice(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(PREFIX + key) ?? null;
  } catch {
    return null;
  }
}

export function writeDevice(key: string, value: string | null): void {
  try {
    if (value === null) globalThis.localStorage?.removeItem(PREFIX + key);
    else globalThis.localStorage?.setItem(PREFIX + key, value);
  } catch {
    // Private windows or blocked storage: the app still works, it just won't remember this.
  }
}

export function getLastBackupAt(): number | null {
  const v = Number(readDevice('last-backup'));
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function setLastBackupAt(when: number): void {
  writeDevice('last-backup', String(when));
}
