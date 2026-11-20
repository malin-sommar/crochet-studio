import { useState } from 'react';
import { Card, Page } from '../../components/Page';
import { useWakeLock, wakeLockSupported } from '../../lib/useWakeLock';
import { tabHref } from '../../router';
import { clearProgress, goToRow, markDoneAndNext, previousRow, setRowDone } from '../edit';
import { colorLabel, type ChartContent } from '../model';
import { rowColor } from '../mosaic';
import { isRightToLeft, rowColors, tapestryRuns } from '../rows';
import { readKeepAwake, writeKeepAwake, type ChartView } from '../view';
import { ChartCanvas } from './ChartCanvas';
import { ZoomSlider } from './ChartEditor';
import { ModeSwitch, type ReadySession, type SetView } from './ChartScreen';
import { Dot, RowChips, rowSummary } from './Chips';
import { HowTo } from './HowTo';

function RowDirection({ chart, n }: { chart: ChartContent; n: number }) {
  if (chart.tech === 'mosaic') {
    const i = rowColor(chart, n);
    return (
      <p className="dir">
        <span className="rowtag">
          <Dot hex={chart.pal[i]!.hex} />
          Color {colorLabel(chart, i)}
        </span>
        <br />
        {n === 1 ? `Foundation: chain ${chart.w + 1}, then sc from the 2nd chain` : 'Front facing you, right to left'} ·
        cut the yarn at the end
      </p>
    );
  }
  const blocks = tapestryRuns(chart, n).length;
  return (
    <p className="dir">
      {isRightToLeft(n) ? 'Right → left on the chart' : 'Left → right on the chart'} · {blocks}{' '}
      {blocks === 1 ? 'block' : 'blocks'}
      {chart.pal.length > 2 && (
        <>
          <br />
          Colors in this row: {rowColors(chart, n).map((i) => colorLabel(chart, i)).join(', ')}
        </>
      )}
    </p>
  );
}

export function CrochetView({ s, view, setView }: { s: ReadySession; view: ChartView; setView: SetView }) {
  const { chart, update } = s;
  const [keepAwake, setKeepAwake] = useState(readKeepAwake);
  const awake = useWakeLock(keepAwake);
  const [confirmClear, setConfirmClear] = useState(false);
  const n = chart.cur;
  const isLast = n === chart.h;

  return (
    <Page title={chart.name} back={{ href: tabHref('charts'), label: 'Charts' }}>
      <ModeSwitch id={chart.id} mode="crochet" />

      <section className="card now" aria-label="Current row">
        <div className="eyebrow">Now crocheting</div>
        <div className="rownum" aria-live="polite">
          Row {n} <span className="muted">of {chart.h}</span>
        </div>
        <RowDirection chart={chart} n={n} />
        <RowChips chart={chart} n={n} />
        <p className="progress muted">
          {chart.done.length} of {chart.h} rows done
        </p>
      </section>

      <section className="card" aria-label="Chart">
        <ChartCanvas
          chart={chart}
          zoom={view.zoom}
          mode="crochet"
          focusRow={n}
          onRowTap={(row) => update((c) => goToRow(c, row))}
          label={`Chart with row ${n} outlined`}
        />
        <ZoomSlider zoom={view.zoom} onChange={(zoom) => setView({ zoom })} />
        <p className="hint">Tap a row in the chart to jump to it.</p>
      </section>

      <Card title="All rows" id="rows">
        <ol className="rowlist">
          {Array.from({ length: chart.h }, (_, i) => i + 1).map((r) => {
            const isDone = chart.done.includes(r);
            return (
              <li key={r} className={`${r === n ? 'cur' : ''} ${isDone ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={isDone}
                  aria-label={`Row ${r} done`}
                  onChange={(e) => update((c) => setRowDone(c, r, e.target.checked))}
                />
                <button type="button" className="rowbtn" onClick={() => update((c) => goToRow(c, r))}>
                  <span className="n">Row {r}</span>
                  <span className="t">
                    {chart.tech === 'mosaic' && <Dot hex={chart.pal[rowColor(chart, r)]!.hex} />}
                    {rowSummary(chart, r)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </Card>

      <section className="card">
        <details className="help">
          <summary>How to work it{chart.tech === 'mosaic' ? ': overlay mosaic' : ''}</summary>
          <HowTo chart={chart} />
        </details>
      </section>

      <Card title="While you crochet" id="while">
        {wakeLockSupported() && (
          <label className="check">
            <input
              type="checkbox"
              checked={keepAwake}
              onChange={(e) => {
                setKeepAwake(e.target.checked);
                writeKeepAwake(e.target.checked);
              }}
            />
            <span>
              Keep the screen on{keepAwake ? (awake ? ' (on now)' : ' (waiting for the browser)') : ''}
            </span>
          </label>
        )}
        {confirmClear ? (
          <div className="note error">
            <p>Clear the progress on this chart? All rows become not done and you start again from row 1.</p>
            <div className="actions">
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  update(clearProgress, { undoable: true });
                  setConfirmClear(false);
                }}
              >
                Yes, clear progress
              </button>
              <button type="button" className="btn" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="actions">
            <button type="button" className="btn" disabled={!chart.done.length && n === 1} onClick={() => setConfirmClear(true)}>
              Clear progress
            </button>
          </div>
        )}
      </Card>

      <div className="crochet-bar">
        <button type="button" className="btn big" disabled={n === 1} onClick={() => update(previousRow)}>
          ← Previous
        </button>
        <button
          type="button"
          className="btn primary big"
          disabled={isLast && chart.done.includes(n)}
          onClick={() => update(markDoneAndNext)}
        >
          {isLast ? 'Done, last row ✓' : 'Done, next row →'}
        </button>
      </div>
    </Page>
  );
}
