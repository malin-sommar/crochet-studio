import { useRef, useState, type ChangeEvent } from 'react';
import { Card, Page } from '../../components/Page';
import { Segmented } from '../../components/Segmented';
import { useLiveQuery } from '../../lib/useLiveQuery';
import { tabHref } from '../../router';
import {
  ChartFileError,
  DEFAULT_PALETTE,
  EXAMPLE_HEART,
  MAX_SIZE,
  MIN_SIZE,
  blankChart,
  readChartCode,
  readProjectFile,
  type ChartContent,
  type Technique,
} from '../model';
import { createChart, listCharts, type ChartRecord } from '../store';
import { ChartThumb } from './ChartCanvas';

function open(id: string) {
  window.location.hash = tabHref('charts', id);
}

function errorText(err: unknown): string {
  if (err instanceof ChartFileError) return err.message;
  return `Something went wrong: ${err instanceof Error ? err.message : String(err)}`;
}

export function ChartList() {
  const charts = useLiveQuery(listCharts, [], null as ChartRecord[] | null);
  const [panel, setPanel] = useState<'new' | 'paste' | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function create(content: ChartContent) {
    const c = await createChart(content);
    open(c.id);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      await create(readProjectFile(await f.text(), f.name));
    } catch (err) {
      setMsg({ text: errorText(err), error: true });
    }
  }

  return (
    <Page title="Charts" lead="Draw or import tapestry and mosaic charts, then follow them row by row.">
      <div className="actions">
        <button type="button" className="btn primary" onClick={() => setPanel(panel === 'new' ? null : 'new')}>
          New chart
        </button>
        <a className="btn" href={tabHref('charts', 'import')}>
          Import picture or PDF
        </a>
        <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
          Open project file
        </button>
        <button type="button" className="btn" onClick={() => setPanel(panel === 'paste' ? null : 'paste')}>
          Paste chart code
        </button>
        <input
          ref={fileInput}
          type="file"
          className="visually-hidden"
          tabIndex={-1}
          aria-label="Project file to open"
          data-testid="open-project-file"
          onChange={(e) => void onFile(e)}
        />
      </div>

      {msg && (
        <div className={`note ${msg.error ? 'error' : ''}`} role={msg.error ? 'alert' : 'status'}>
          <p>{msg.text}</p>
        </div>
      )}
      {panel === 'new' && <NewChartPanel onCreate={create} onCancel={() => setPanel(null)} />}
      {panel === 'paste' && <PastePanel onCreate={create} onCancel={() => setPanel(null)} />}

      {charts === null ? null : charts.length === 0 ? (
        <Card title="No charts yet">
          <p>
            Start a new chart, import a picture or a PDF pattern, or open a project file saved from the Tapestry Chart
            Tracker.
          </p>
          <div className="actions">
            <button type="button" className="btn" onClick={() => void create(EXAMPLE_HEART)}>
              Try an example
            </button>
          </div>
        </Card>
      ) : (
        <ul className="chart-list">
          {charts.map((c) => (
            <ChartCard key={c.id} chart={c} />
          ))}
        </ul>
      )}
    </Page>
  );
}

function ChartCard({ chart }: { chart: ChartRecord }) {
  const started = chart.done.length > 0 || chart.cur > 1;
  return (
    <li className="chart-card">
      <a className="thumb-link" href={tabHref('charts', chart.id)} tabIndex={-1} aria-hidden="true">
        <ChartThumb chart={chart} />
      </a>
      <div className="chart-card-body">
        <h2>
          <a href={tabHref('charts', chart.id)}>{chart.name}</a>
        </h2>
        <p className="muted">
          {chart.w} × {chart.h} · {chart.tech === 'mosaic' ? 'Mosaic' : 'Tapestry'} · {chart.pal.length} colors
        </p>
        <p className="muted">
          {started ? `Row ${chart.cur} · ${chart.done.length} of ${chart.h} rows done` : 'Not started'}
        </p>
        <div className="actions">
          <a className="btn primary" href={tabHref('charts', chart.id, 'crochet')}>
            {started ? 'Continue' : 'Crochet'}
          </a>
          <a className="btn" href={tabHref('charts', chart.id)}>
            Edit
          </a>
        </div>
      </div>
    </li>
  );
}

function NewChartPanel({ onCreate, onCancel }: { onCreate: (c: ChartContent) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [w, setW] = useState('25');
  const [h, setH] = useState('25');
  const [tech, setTech] = useState<Technique>('tapestry');
  return (
    <Card title="New chart" id="new-chart">
      <label className="field">
        <span>Name</span>
        <input type="text" value={name} maxLength={60} placeholder="New chart" onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="fields">
        <label className="field">
          <span>Width (stitches)</span>
          <input type="number" inputMode="numeric" min={MIN_SIZE} max={MAX_SIZE} value={w} onChange={(e) => setW(e.target.value)} />
        </label>
        <label className="field">
          <span>Height (rows)</span>
          <input type="number" inputMode="numeric" min={MIN_SIZE} max={MAX_SIZE} value={h} onChange={(e) => setH(e.target.value)} />
        </label>
      </div>
      <Segmented
        label="Technique"
        options={[
          { value: 'tapestry', label: 'Tapestry' },
          { value: 'mosaic', label: 'Mosaic' },
        ]}
        value={tech}
        onChange={setTech}
      />
      <p className="hint">
        To copy a chart by hand, count its squares across and down and type them here. You can change the size later.
      </p>
      <div className="actions">
        <button
          type="button"
          className="btn primary"
          onClick={() =>
            void onCreate({ ...blankChart(Number(w), Number(h), DEFAULT_PALETTE), name: name.trim() || 'New chart', tech })
          }
        >
          Create chart
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Card>
  );
}

function PastePanel({ onCreate, onCancel }: { onCreate: (c: ChartContent) => Promise<void>; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  return (
    <Card title="Paste chart code" id="paste">
      <p className="hint">
        Paste a chart code (it starts with v2|), or the contents of a project file. It opens as a new chart.
      </p>
      <textarea className="code" rows={4} value={text} onChange={(e) => setText(e.target.value)} aria-label="Chart code" />
      {error && (
        <p className="note error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button
          type="button"
          className="btn primary"
          disabled={!text.trim()}
          onClick={async () => {
            try {
              await onCreate(readChartCode(text));
            } catch (err) {
              setError(errorText(err));
            }
          }}
        >
          Open chart
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Card>
  );
}
