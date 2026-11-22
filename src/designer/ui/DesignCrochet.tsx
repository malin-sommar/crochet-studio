import { useState } from 'react';
import { ModeSwitch } from '../../components/ModeSwitch';
import { Card, Page } from '../../components/Page';
import { Dot } from '../../charts/ui/Chips';
import { readKeepAwake, writeKeepAwake } from '../../charts/view';
import { useWakeLock, wakeLockSupported } from '../../lib/useWakeLock';
import { tabHref } from '../../router';
import { useTerms } from '../../stitches/ui/common';
import { renderTerms } from '../../stitches/terms';
import type { DesignContent } from '../model';
import { designPattern } from '../patterns';
import { rowInstructions } from '../plan';
import { useDesignFacts, type ReadyDesign } from './DesignScreen';
import { LOOP_LABELS, stitchLabel } from './DesignEditor';
import { CloseUp, PiecePreview } from './Previews';

const colorName = (d: DesignContent, i: number) => d.colors[i]?.name || `Color ${i + 1}`;

export function DesignCrochet({ s }: { s: ReadyDesign }) {
  const d = s.value;
  const { update } = s;
  const terms = useTerms();
  const { plan, size } = useDesignFacts(d);
  const [keepAwake, setKeepAwake] = useState(readKeepAwake);
  const awake = useWakeLock(keepAwake);
  const [confirmClear, setConfirmClear] = useState(false);
  const total = plan.rows.length;

  const back = { href: tabHref('designer'), label: 'Designer' };
  const modes = <ModeSwitch editHref={tabHref('designer', d.id)} crochetHref={tabHref('designer', d.id, 'crochet')} mode="crochet" />;
  if (!total) {
    return (
      <Page title={d.name} back={back}>
        {modes}
        <p className="note">This design has no rows yet. Add some in Edit.</p>
      </Page>
    );
  }

  const n = Math.min(Math.max(1, d.cur), total);
  const row = plan.rows[n - 1]!;
  const next = plan.rows[n];
  const text = rowInstructions(row, d.width);
  const pattern = designPattern(row.stitch)!;
  const isLast = n === total;
  const goTo = (to: number) => update((x) => ({ ...x, cur: Math.min(Math.max(1, to), total) }));
  const setDone = (r: number, on: boolean) =>
    update((x) => ({ ...x, done: on ? [...new Set([...x.done, r])].sort((a, b) => a - b) : x.done.filter((v) => v !== r) }));
  const closeFrom = Math.max(1, n - 5);

  return (
    <Page title={d.name} back={back}>
      {modes}

      <section className="card now" aria-label="Current row">
        <div className="eyebrow">Now crocheting</div>
        <div className="rownum" aria-live="polite">
          Row {n} <span className="muted">of {total}</span>
        </div>
        <p className="dir">
          <span className="rowtag">
            <Dot hex={d.colors[row.color]?.hex ?? '#888888'} />
            {colorName(d, row.color)}
          </span>{' '}
          · {stitchLabel(row.stitch, terms)}
          {row.loop !== 'both' ? ` · ${LOOP_LABELS[row.loop].toLowerCase()}` : ''} ·{' '}
          {row.side === 'RS' ? 'right side facing' : 'wrong side facing'}
        </p>
        {n === 1 && plan.chain && (
          <p className="instr">
            <strong>Start:</strong> {renderTerms(`chain ${plan.chain} in ${colorName(d, row.color)}.`, terms)}
          </p>
        )}
        {text ? (
          <p className="instr" data-testid="row-instructions">
            {renderTerms(text, terms)}
          </p>
        ) : (
          <p className="note error">
            {stitchLabel(row.stitch, terms)} doesn't fit {d.width} stitches across. Change the width in Edit.
          </p>
        )}
        <p className="progress">
          <strong>{d.width} stitches</strong>
          {pattern.plain ? '' : ' (counting each chain space as a stitch)'} · {d.done.length} of {total} rows done
        </p>
        {pattern.note && <p className="muted small">{renderTerms(pattern.note, terms)}</p>}
        {next && next.color !== row.color && (
          <p className="note" role="status">
            Next row is {colorName(d, next.color)}: join it on the last yarn over of this row.
          </p>
        )}
      </section>

      <section className="card" aria-label="Rows so far">
        <div className="preview-grid">
          <div>
            <h2>Close-up</h2>
            <CloseUp design={d} plan={plan} from={closeFrom} count={n - closeFrom + 1} label={`Rows ${closeFrom} to ${n}`} />
            <p className="muted small">
              Rows {closeFrom}–{n}, row {n} at the top.
            </p>
          </div>
          <div>
            <h2>The whole piece</h2>
            <PiecePreview design={d} plan={plan} size={size} maxHeight={240} highlight={n} label={`The whole piece with row ${n} outlined`} />
          </div>
        </div>
      </section>

      <Card title="All rows" id="rows">
        <ol className="rowlist">
          {plan.rows.map((r) => {
            const isDone = d.done.includes(r.n);
            return (
              <li key={r.n} className={`${r.n === n ? 'cur' : ''} ${isDone ? 'done' : ''}`}>
                <input type="checkbox" checked={isDone} aria-label={`Row ${r.n} done`} onChange={(e) => setDone(r.n, e.target.checked)} />
                <button type="button" className="rowbtn" onClick={() => goTo(r.n)}>
                  <span className="n">Row {r.n}</span>
                  <span className="t">
                    <Dot hex={d.colors[r.color]?.hex ?? '#888888'} />
                    {stitchLabel(r.stitch, terms)} · {colorName(d, r.color)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </Card>

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
            <span>Keep the screen on{keepAwake ? (awake ? ' (on now)' : ' (waiting for the browser)') : ''}</span>
          </label>
        )}
        {confirmClear ? (
          <div className="note error">
            <p>Clear the progress on this design? All rows become not done and you start again from row 1.</p>
            <div className="actions">
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  update((x) => ({ ...x, cur: 1, done: [] }), { undoable: true });
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
            <button type="button" className="btn" disabled={!d.done.length && n === 1} onClick={() => setConfirmClear(true)}>
              Clear progress
            </button>
          </div>
        )}
      </Card>

      <div className="crochet-bar">
        <button type="button" className="btn big" disabled={n === 1} onClick={() => goTo(n - 1)}>
          ← Previous
        </button>
        <button
          type="button"
          className="btn primary big"
          disabled={isLast && d.done.includes(n)}
          onClick={() =>
            update((x) => ({ ...x, done: [...new Set([...x.done, n])].sort((a, b) => a - b), cur: Math.min(n + 1, total) }))
          }
        >
          {isLast ? 'Done, last row ✓' : 'Done, next row →'}
        </button>
      </div>
    </Page>
  );
}
