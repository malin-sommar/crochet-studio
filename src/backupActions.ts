import { daysBetween } from './lib/format';
import { downloadFile } from './lib/download';
import { signal } from './lib/signal';
import { backupFileName, createBackup, serializeBackup } from './storage/backup';
import { getLastBackupAt, setLastBackupAt } from './storage/device';

/** When a backup was last saved on this device (null: never). */
export const lastBackupAt = signal<number | null>(getLastBackupAt());

/** Saves a backup of everything as a file in the device's downloads. Returns the file name. */
export async function saveBackupFile(): Promise<string> {
  const now = new Date();
  const text = serializeBackup(await createBackup(__APP_VERSION__, now));
  const name = backupFileName(now);
  downloadFile(name, text, 'application/json');
  setLastBackupAt(now.getTime());
  lastBackupAt.set(now.getTime());
  return name;
}

const REMIND_AFTER_DAYS = 14;
/** With no backup at all, wait until the work is a couple of days old before asking. */
const FIRST_REMINDER_DAYS = 2;

/** Whether to remind about saving a backup. */
export function backupIsDue(
  summary: { count: number; oldestCreatedAt: number | null },
  lastBackup: number | null,
  now: number = Date.now(),
): boolean {
  if (summary.count === 0) return false;
  if (lastBackup !== null) return daysBetween(lastBackup, now) >= REMIND_AFTER_DAYS;
  return summary.oldestCreatedAt !== null && daysBetween(summary.oldestCreatedAt, now) >= FIRST_REMINDER_DAYS;
}
