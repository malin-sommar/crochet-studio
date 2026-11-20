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
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  setLastBackupAt(now.getTime());
  lastBackupAt.set(now.getTime());
  return name;
}
