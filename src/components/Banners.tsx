import { useState } from 'react';
import { backupIsDue, lastBackupAt, saveBackupFile } from '../backupActions';
import { daysBetween } from '../lib/format';
import { useSignal } from '../lib/signal';
import { useLiveQuery } from '../lib/useLiveQuery';
import { applyUpdate, updateReady } from '../pwa';
import { contentSummary } from '../storage/content';

export function UpdateBanner() {
  const ready = useSignal(updateReady);
  if (!ready) return null;
  return (
    <div className="banner" role="status">
      <span>A new version of Crochet Studio is ready. Your work is saved.</span>
      <button type="button" className="btn primary" onClick={() => void applyUpdate()}>
        Update now
      </button>
    </div>
  );
}

/** Shown when there is work on this device and no recent backup of it. */
export function BackupReminder() {
  const summary = useLiveQuery(contentSummary, [], { count: 0, oldestCreatedAt: null });
  const last = useSignal(lastBackupAt);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  const days = last === null ? null : daysBetween(last, Date.now());
  if (hidden || !backupIsDue(summary, last)) return null;

  return (
    <div className="banner" role="status">
      <span>
        {days === null
          ? "Your work on this device hasn't been backed up yet."
          : `Your last backup from this device was ${days} days ago.`}
      </span>
      <span className="banner-actions">
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await saveBackupFile();
            } finally {
              setBusy(false);
            }
          }}
        >
          Save a backup
        </button>
        <button type="button" className="btn" onClick={() => setHidden(true)}>
          Later
        </button>
      </span>
    </div>
  );
}
