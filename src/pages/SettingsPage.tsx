import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { lastBackupAt, saveBackupFile } from '../backupActions';
import { ChartFileError, isProjectFile, readProjectFile } from '../charts/model';
import { createChart } from '../charts/store';
import { tabHref } from '../router';
import { Card, Page } from '../components/Page';
import { Segmented } from '../components/Segmented';
import { formatAgo, formatDate, formatDateTime } from '../lib/format';
import { useSignal } from '../lib/signal';
import { useLiveQuery } from '../lib/useLiveQuery';
import { canInstall, isInstalled, promptInstall } from '../pwa';
import { THEME_LABELS, useThemeChoice, type ThemeChoice } from '../theme';
import {
  BackupError,
  applyImport,
  previewImport,
  readBackup,
  type BackupFile,
  type ImportResult,
  type MergeCounts,
} from '../storage/backup';
import { deleteForever, emptyTrash, listTrash, restoreFromTrash, type TrashItem } from '../storage/content';
import { BACKUP_STORES, STORE_LABELS } from '../storage/db';
import { formatBytes, getStorageStatus, requestPersistentStorage, type StorageStatus } from '../storage/persist';
import { DEFAULT_PREFS, TERMS_LABELS, getPrefs, setPrefs, type Terms } from '../storage/prefs';

export function SettingsPage() {
  return (
    <Page title="Settings">
      <AppearanceCard />
      <TermsCard />
      <BackupCard />
      <StorageCard />
      <TrashCard />
      <AboutCard />
    </Page>
  );
}

function AppearanceCard() {
  const [theme, setTheme] = useThemeChoice();
  const options = (Object.keys(THEME_LABELS) as ThemeChoice[]).map((value) => ({ value, label: THEME_LABELS[value] }));
  return (
    <Card title="Appearance" id="appearance">
      <Segmented label="Theme" options={options} value={theme} onChange={setTheme} />
      <p className="muted">Automatic follows your device's light or dark setting. This choice is for this device only.</p>
    </Card>
  );
}

function TermsCard() {
  const prefs = useLiveQuery(getPrefs, [], DEFAULT_PREFS);
  const options = (Object.keys(TERMS_LABELS) as Terms[]).map((value) => ({ value, label: TERMS_LABELS[value] }));
  return (
    <Card title="Crochet terms" id="terms">
      <Segmented
        label="Show stitch names in"
        options={options}
        value={prefs.terms}
        onChange={(terms) => void setPrefs({ terms })}
      />
      <p className="muted">
        The other names are shown next to them. Watch out: the same name can mean different stitches. A US{' '}
        <i>single crochet</i> (sc) is a UK <i>double crochet</i> (dc), and a <i>fast maska</i> in Swedish.
      </p>
    </Card>
  );
}

type ImportState =
  | { step: 'idle' }
  | { step: 'reading' }
  | { step: 'preview'; fileName: string; file: BackupFile; preview: ImportResult }
  | { step: 'importing' }
  | { step: 'done'; result: ImportResult }
  | { step: 'chart'; id: string; name: string }
  | { step: 'error'; message: string };

function looksLikeProjectFile(text: string): boolean {
  try {
    return isProjectFile(JSON.parse(text));
  } catch {
    return false;
  }
}

function countsText(c: MergeCounts): string {
  const parts: string[] = [];
  if (c.added) parts.push(`${c.added} new`);
  if (c.updated) parts.push(`${c.updated} updated`);
  if (c.kept) parts.push(`${c.kept} unchanged`);
  return parts.join(', ') || 'nothing';
}

function BackupCard() {
  const last = useSignal(lastBackupAt);
  const [saveMsg, setSaveMsg] = useState('');
  const [state, setState] = useState<ImportState>({ step: 'idle' });
  const fileInput = useRef<HTMLInputElement>(null);

  async function onSave() {
    setSaveMsg('');
    try {
      const name = await saveBackupFile();
      setSaveMsg(`Saved ${name} to your downloads.`);
    } catch (e) {
      setSaveMsg(`The backup couldn't be saved: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setState({ step: 'reading' });
    try {
      const text = await f.text();
      if (looksLikeProjectFile(text)) {
        // A single chart from the Tapestry Chart Tracker (or saved here): open it as a new chart.
        const chart = await createChart(readProjectFile(text, f.name));
        setState({ step: 'chart', id: chart.id, name: chart.name });
        return;
      }
      const file = readBackup(text);
      setState({ step: 'preview', fileName: f.name, file, preview: await previewImport(file) });
    } catch (err) {
      setState({ step: 'error', message: errorText(err) });
    }
  }

  async function onImport(file: BackupFile) {
    setState({ step: 'importing' });
    try {
      setState({ step: 'done', result: await applyImport(file) });
    } catch (err) {
      setState({ step: 'error', message: errorText(err) });
    }
  }

  return (
    <Card title="Backup and moving between devices" id="backup">
      <p>
        Last backup from this device:{' '}
        <strong>{last === null ? 'never' : `${formatAgo(last)} (${formatDate(last)})`}</strong>
      </p>
      <div className="actions">
        <button type="button" className="btn primary" onClick={() => void onSave()}>
          Save backup file
        </button>
        <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
          Import a backup…
        </button>
        <input
          ref={fileInput}
          type="file"
          className="visually-hidden"
          tabIndex={-1}
          aria-label="Backup file to import"
          data-testid="import-file"
          onChange={(e) => void onPick(e)}
        />
      </div>
      {saveMsg && (
        <p className="note" role="status">
          {saveMsg}
        </p>
      )}

      {state.step === 'reading' && <p role="status">Reading the file…</p>}
      {state.step === 'importing' && <p role="status">Importing…</p>}
      {state.step === 'error' && (
        <div className="note error" role="alert">
          <p>{state.message}</p>
          <button type="button" className="btn" onClick={() => setState({ step: 'idle' })}>
            OK
          </button>
        </div>
      )}
      {state.step === 'preview' && (
        <ImportPreview
          {...state}
          onImport={() => void onImport(state.file)}
          onCancel={() => setState({ step: 'idle' })}
        />
      )}
      {state.step === 'chart' && (
        <div className="note ok" role="status">
          <p>
            That was a chart project file, so it opened as a new chart: “{state.name}”.
          </p>
          <div className="actions">
            <a className="btn" href={tabHref('charts', state.id)}>
              Open the chart
            </a>
            <button type="button" className="btn" onClick={() => setState({ step: 'idle' })}>
              OK
            </button>
          </div>
        </div>
      )}
      {state.step === 'done' && (
        <div className="note ok" role="status">
          <p>
            Imported: {state.result.total.added} new and {state.result.total.updated} updated.
          </p>
          <button type="button" className="btn" onClick={() => setState({ step: 'idle' })}>
            OK
          </button>
        </div>
      )}

      <details className="help">
        <summary>How to move your work to another device</summary>
        <ol>
          <li>On the device you worked on, tap Save backup file.</li>
          <li>
            Put the file somewhere the other device can reach, for example Google Drive, or email it to yourself.
          </li>
          <li>On the other device, open Settings, tap Import a backup and pick the file.</li>
        </ol>
        <p>
          Importing never deletes anything. For each item, the newest version wins. Things you deleted on the
          other device go to the Trash here, so you can still get them back.
        </p>
      </details>
    </Card>
  );
}

function ImportPreview({
  fileName,
  file,
  preview,
  onImport,
  onCancel,
}: {
  fileName: string;
  file: BackupFile;
  preview: ImportResult;
  onImport: () => void;
  onCancel: () => void;
}) {
  const changes = preview.total.added + preview.total.updated;
  const saved = Date.parse(file.exportedAt);
  return (
    <div className="note" role="region" aria-label="Import preview">
      <p>
        <strong>{fileName}</strong>
        {Number.isFinite(saved) && <>, saved {formatDateTime(saved)}</>}
      </p>
      {changes === 0 ? (
        <p>Everything in this file is already on this device. There is nothing to import.</p>
      ) : (
        <>
          <ul>
            {BACKUP_STORES.filter((s) => preview.stores[s]).map((s) => (
              <li key={s}>
                {STORE_LABELS[s]}: {countsText(preview.stores[s]!)}
              </li>
            ))}
          </ul>
          {preview.total.kept > 0 && (
            <p className="muted">Unchanged means this device already has the same or a newer version.</p>
          )}
          {preview.total.toTrash > 0 && (
            <p>
              {preview.total.toTrash === 1 ? '1 item was' : `${preview.total.toTrash} items were`} deleted on the
              other device and will move to the Trash here.
            </p>
          )}
        </>
      )}
      <div className="actions">
        {changes > 0 && (
          <button type="button" className="btn primary" onClick={onImport}>
            Import
          </button>
        )}
        <button type="button" className="btn" onClick={onCancel}>
          {changes > 0 ? 'Cancel' : 'OK'}
        </button>
      </div>
    </div>
  );
}

function errorText(err: unknown): string {
  if (err instanceof BackupError || err instanceof ChartFileError) return err.message;
  return `Something went wrong: ${err instanceof Error ? err.message : String(err)}. Nothing was changed.`;
}

function StorageCard() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [asked, setAsked] = useState(false);
  const installable = useSignal(canInstall);
  const installed = isInstalled();

  const refresh = () => void getStorageStatus().then(setStatus);
  useEffect(refresh, []);

  return (
    <Card title="Storage on this device" id="storage">
      <p>
        Everything you make is saved in this browser on this device, as you go. Nothing is sent anywhere.
      </p>
      {status && !status.supported && <p>This browser can't report how your data is stored.</p>}
      {status?.supported && (
        <>
          <p>
            Protected from automatic clean-up: <strong>{status.persisted ? 'yes' : 'not yet'}</strong>
            {status.usageBytes !== undefined && <> · Space used: {formatBytes(status.usageBytes)}</>}
          </p>
          {!status.persisted && (
            <>
              <p className="muted">
                Without protection, the browser may clear saved data when the device runs out of space. Installing
                the app usually turns protection on.
              </p>
              <div className="actions">
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    await requestPersistentStorage();
                    setAsked(true);
                    refresh();
                  }}
                >
                  Ask the browser to protect it
                </button>
              </div>
              {asked && (
                <p className="note" role="status">
                  The browser hasn't turned it on yet. Chrome decides this itself, often once the app is installed
                  or used regularly. Keep saving backups meanwhile.
                </p>
              )}
            </>
          )}
        </>
      )}
      {installed ? (
        <p>You're using the installed app.</p>
      ) : (
        installable && (
          <div className="actions">
            <button
              type="button"
              className="btn primary"
              onClick={async () => {
                await promptInstall();
                refresh();
              }}
            >
              Install Crochet Studio on this device
            </button>
          </div>
        )
      )}
    </Card>
  );
}

function TrashCard() {
  const items = useLiveQuery(listTrash, [], [] as TrashItem[]);
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <Card title="Trash" id="trash">
      {items.length === 0 ? (
        <p className="muted">The Trash is empty. Things you delete go here first, so you can bring them back.</p>
      ) : (
        <>
          <ul className="trash-list">
            {items.map((it) => {
              const key = `${it.store}/${it.id}`;
              return (
                <li key={key}>
                  <div>
                    <strong>{it.name}</strong>
                    <div className="muted">
                      {STORE_LABELS[it.store]} · deleted {formatAgo(it.deletedAt)}
                    </div>
                  </div>
                  {confirm === key ? (
                    <div className="actions">
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => void deleteForever(it.store, it.id).then(() => setConfirm(null))}
                      >
                        Yes, delete for good
                      </button>
                      <button type="button" className="btn" onClick={() => setConfirm(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="actions">
                      <button type="button" className="btn" onClick={() => void restoreFromTrash(it.store, it.id)}>
                        Restore
                      </button>
                      <button type="button" className="btn danger" onClick={() => setConfirm(key)}>
                        Delete for good
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {confirm === '*' ? (
            <div className="note error">
              <p>
                Delete {items.length === 1 ? 'this item' : `all ${items.length} items`} for good? This can't be
                undone.
              </p>
              <div className="actions">
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => void emptyTrash().then(() => setConfirm(null))}
                >
                  Yes, empty the Trash
                </button>
                <button type="button" className="btn" onClick={() => setConfirm(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="actions">
              <button type="button" className="btn danger" onClick={() => setConfirm('*')}>
                Empty the Trash
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function AboutCard() {
  return (
    <Card title="About" id="about">
      <p>Crochet Studio {__APP_VERSION__}</p>
    </Card>
  );
}
