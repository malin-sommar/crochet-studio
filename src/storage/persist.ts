/**
 * Browsers may clear a site's saved data when the device runs low on space, unless the site is
 * allowed "persistent storage". Chrome on Android usually grants it without asking once the app
 * is installed or used often.
 */

export interface StorageStatus {
  supported: boolean;
  persisted: boolean;
  usageBytes?: number;
  quotaBytes?: number;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const s = globalThis.navigator?.storage;
  if (!s || typeof s.persisted !== 'function') return { supported: false, persisted: false };
  const persisted = await s.persisted().catch(() => false);
  const estimate = typeof s.estimate === 'function' ? await s.estimate().catch(() => undefined) : undefined;
  return { supported: true, persisted, usageBytes: estimate?.usage, quotaBytes: estimate?.quota };
}

/** Asks the browser to protect this app's data. Returns whether it's protected now. */
export async function requestPersistentStorage(): Promise<boolean> {
  const s = globalThis.navigator?.storage;
  if (!s || typeof s.persist !== 'function') return false;
  try {
    if (await s.persisted()) return true;
    return await s.persist();
  } catch {
    return false;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
