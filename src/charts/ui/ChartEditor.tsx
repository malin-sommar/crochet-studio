import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Card, Page } from '../../components/Page';
import { Segmented } from '../../components/Segmented';
import { copyText, downloadFile } from '../../lib/download';
import { tabHref } from '../../router';
import { addBorder, canAddBorder, flip, mirror, resize } from '../edit';
import { LETTERS, MAX_SIZE, MIN_SIZE, chartCode, fileBaseName, projectFileText, type ChartContent } from '../model';
import { backCells, checkMosaic } from '../mosaic';
import { duplicateChart, trashChart } from '../store';
import { MAX_ZOOM, MIN_ZOOM } from '../view';
import { ChartCanvas } from './ChartCanvas';
import { ModeSwitch, type ReadySession, type SetView } from './ChartScreen';
import { ColorPicker, PaletteEditor } from './PaletteEditor';
import type { ChartView } from '../view';

export function ChartEditor({ s, view, setView }: { s: ReadySession; view: ChartView; setView: SetView }) {
  const { chart, update, undo, canUndo } = s;
  const check = useMemo(() => (chart.tech === 'mosaic' ? checkMosaic(chart) : null), [chart]);
  const activeColor = chart.pal[view.active]!;

  return (
    <Page title={chart.name} back={{ href: tabHref('charts'), label: 'Charts' }}>
      <ModeSwitch id={chart.id} mode="edit" />

      <section className="card" aria-label="Chart">
        <div className="toolbar">
          <Segmented
            label="Tool"
            options={[
              { value: 'paint', label: 'Paint' },
              { value: 'scroll', label: 'Scroll' },
            ]}
            value={view.tool}
            onChange={(tool) => setView({ tool })}
          />
          <button type="button" className="btn" disabled={!canUndo} onClick={undo}>
            Undo
          </button>
        </div>
        <ColorPicker chart={chart} active={view.active} onPick={(active) => setView({ active, tool: 'paint' })} />
        <p className="hint">
          {view.tool === 'paint'
            ? `Painting with ${LETTERS[view.active]}${activeColor.name ? ` (${activeColor.name})` : ''}. Tap a square that's already that color to clear it to A.`
            : 'Drag to move around the chart. Choose Paint to draw.'}
        </p>
        <ChartCanvas
          chart={chart}
          zoom={view.zoom}
          mode="edit"
          tool={view.tool}
          active={view.active}
          onStroke={(cells) => update((c) => ({ ...c, cells }), { undoable: true })}
          label={`Chart, ${chart.w} by ${chart.h} squares`}
        />
        <ZoomSlider zoom={view.zoom} onChange={(zoom) => setView({ zoom })} />
        {check && <MosaicStatus check={check} />}
        {chart.tech === 'mosaic' && chart.rev && <BackPreview chart={chart} />}
      </section>

      <Card title="Colors" id="colors">
        <p className="hint">
          Color A is the background. Tap a color to draw with it, name it after your yarn, and use the swatch on the
          right to match its shade.
        </p>
        <PaletteEditor
          chart={chart}
          active={view.active}
          onPick={(active) => setView({ active, tool: 'paint' })}
          update={update}
        />
      </Card>

      <SizeCard chart={chart} update={update} />
      <TechniqueCard chart={chart} update={update} onMosaic={() => setView({ active: Math.min(view.active, 1) })} />
      <ChartActions s={s} />
    </Page>
  );
}

export function ZoomSlider({ zoom, onChange }: { zoom: number; onChange: (z: number) => void }) {
  return (
    <label className="zoom">
      <span>Zoom</span>
      <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} value={zoom} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function MosaicStatus({ check }: { check: ReturnType<typeof checkMosaic> }) {
  if (!check.bad.size) {
    return (
      <p className="note ok" role="status">
        Mosaic check: every square can be made. ✓
      </p>
    );
  }
  return (
    <div className="note error" role="status">
      <p>
        <b>
          {check.bad.size} {check.bad.size === 1 ? 'square breaks' : 'squares break'} the mosaic rules
        </b>{' '}
        (outlined in red):
      </p>
      <ul>
        {check.messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

function BackPreview({ chart }: { chart: ChartContent }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const k = Math.max(1, Math.floor(320 / Math.max(chart.w, chart.h)));
    cv.width = chart.w * k;
    cv.height = chart.h * k;
    backCells(chart).forEach((row, r) =>
      row.forEach((v, c) => {
        ctx.fillStyle = chart.pal[v]!.hex;
        ctx.fillRect(c * k, r * k, k, k);
      }),
    );
  }, [chart]);
  return (
    <figure className="back-preview">
      <canvas ref={ref} aria-label="The back of the piece" role="img" />
      <figcaption className="muted">The back: mirrored, with the colors swapped</figcaption>
    </figure>
  );
}

type Update = ReadySession['update'];

function SizeCard({ chart, update }: { chart: ChartContent; update: Update }) {
  const [w, setW] = useState(String(chart.w));
  const [h, setH] = useState(String(chart.h));
  useEffect(() => {
    setW(String(chart.w));
    setH(String(chart.h));
  }, [chart.w, chart.h]);

  return (
    <Card title="Size and shape" id="size">
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
      <div className="actions">
        <button
          type="button"
          className="btn"
          disabled={Number(w) === chart.w && Number(h) === chart.h}
          onClick={() => update((c) => resize(c, Number(w), Number(h)), { undoable: true })}
        >
          Change size
        </button>
        <button
          type="button"
          className="btn"
          disabled={!canAddBorder(chart)}
          onClick={() => update(addBorder, { undoable: true })}
        >
          Add 3-stitch border
        </button>
        <button type="button" className="btn" onClick={() => update(mirror, { undoable: true })}>
          Mirror left ↔ right
        </button>
        <button type="button" className="btn" onClick={() => update(flip, { undoable: true })}>
          Flip top ↕ bottom
        </button>
      </div>
      <p className="hint">
        Changing the size keeps what you've drawn, starting from the top-left corner. The border adds 3 stitches of
        color A on every side. Mirroring keeps your progress; Undo reverses any of these.
      </p>
    </Card>
  );
}

function TechniqueCard({ chart, update, onMosaic }: { chart: ChartContent; update: Update; onMosaic: () => void }) {
  return (
    <Card title="Technique" id="technique">
      <Segmented
        label="How it's crocheted"
        options={[
          { value: 'tapestry', label: 'Tapestry' },
          { value: 'mosaic', label: 'Mosaic' },
        ]}
        value={chart.tech}
        onChange={(tech) => {
          update((c) => ({ ...c, tech }), { undoable: true });
          if (tech === 'mosaic') onMosaic();
        }}
      />
      {chart.tech === 'mosaic' && (
        <>
          {chart.pal.length > 2 && (
            <p className="note">
              Mosaic uses two colors: A and B. Squares in other colors are outlined until you repaint them.
            </p>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={chart.rev}
              onChange={(e) => update((c) => ({ ...c, rev: e.target.checked }))}
            />
            <span>Reversible (the back shows the design in swapped colors)</span>
          </label>
          <label className="field">
            <span>Row 1 color</span>
            <select
              value={chart.mfirst}
              onChange={(e) => update((c) => ({ ...c, mfirst: e.target.value === '1' ? 1 : 0 }))}
            >
              <option value={0}>A{chart.pal[0]!.name ? ` (${chart.pal[0]!.name})` : ''}</option>
              <option value={1}>B{chart.pal[1]!.name ? ` (${chart.pal[1]!.name})` : ''}</option>
            </select>
          </label>
        </>
      )}
      <p className="hint">
        {chart.tech === 'mosaic'
          ? 'Overlay mosaic: one color per row, worked from the front. The stitches follow from the picture.'
          : 'Tapestry crochet in single crochet, carrying the colors you are not using.'}
      </p>
    </Card>
  );
}

function ChartActions({ s }: { s: ReadySession }) {
  const { chart, update, flush } = s;
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [code, setCode] = useState('');

  return (
    <Card title="This chart" id="this-chart">
      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={chart.name}
          maxLength={60}
          placeholder="Name this chart"
          onChange={(e) => update((c) => ({ ...c, name: e.target.value }))}
          onBlur={() => {
            if (!chart.name.trim()) update((c) => ({ ...c, name: 'Untitled' }));
          }}
        />
      </label>
      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            downloadFile(`${fileBaseName(chart.name)}.json`, projectFileText(chart), 'application/json');
            setMsg('Project file saved to your downloads.');
          }}
        >
          Download project file
        </button>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            await flush();
            const copy = await duplicateChart(chart);
            window.location.hash = tabHref('charts', copy.id);
          }}
        >
          Duplicate
        </button>
      </div>
      {msg && (
        <p className="note" role="status">
          {msg}
        </p>
      )}

      <details className="help" onToggle={() => setCode(chartCode(chart))}>
        <summary>Chart code (the chart as text)</summary>
        <p className="hint">
          The chart code is this chart as one line of text. You can paste it on the Charts page to open a copy.
        </p>
        <textarea className="code" readOnly value={code} aria-label="Chart code" rows={4} />
        <div className="actions">
          <button
            type="button"
            className="btn"
            onClick={async () => setMsg((await copyText(chartCode(chart))) ? 'Chart code copied.' : 'Select the code and copy it.')}
          >
            Copy chart code
          </button>
        </div>
      </details>

      {confirmDelete ? (
        <div className="note error">
          <p>Move “{chart.name}” to the Trash? You can restore it from Settings.</p>
          <div className="actions">
            <button
              type="button"
              className="btn danger"
              onClick={async () => {
                await flush();
                await trashChart(chart.id);
                window.location.hash = tabHref('charts');
              }}
            >
              Move to Trash
            </button>
            <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="actions">
          <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
            Delete chart
          </button>
        </div>
      )}
    </Card>
  );
}
