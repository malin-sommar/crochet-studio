import { useState } from 'react';
import { ModeSwitch } from '../../components/ModeSwitch';
import { NumberField, Stepper } from '../../components/NumberField';
import { Card, Page } from '../../components/Page';
import { tabHref } from '../../router';
import { Dot } from '../../charts/ui/Chips';
import { getStitch } from '../../stitches/data';
import { useTerms } from '../../stitches/ui/common';
import type { Terms } from '../../storage/prefs';
import { SPARE, formatCm, widthFromCm } from '../measure';
import {
  DESIGN_COLORS,
  MAX_COLORS,
  MAX_LINE_ROWS,
  MAX_TIMES,
  MAX_WIDTH,
  newBlock,
  newLine,
  removeDesignColor,
  type DesignBlock,
  type DesignContent,
  type DesignLine,
} from '../model';
import { designPattern, type Loop } from '../patterns';
import { DESIGN_STITCH_IDS, blockRanges } from '../plan';
import { duplicateDesign, trashDesign } from '../store';
import { useDesignFacts, type ReadyDesign } from './DesignScreen';
import { CloseUp, PiecePreview } from './Previews';

type Update = ReadyDesign['update'];

export const LOOP_LABELS: Record<Loop, string> = { both: 'Both loops', blo: 'Back loop only', flo: 'Front loop only' };

export function stitchLabel(id: string, terms: Terms): string {
  return getStitch(id)?.names[terms].name ?? id;
}

export function DesignEditor({ s }: { s: ReadyDesign }) {
  const d = s.value;
  const { update } = s;
  const { plan, size, yarn } = useDesignFacts(d);
  const ranges = blockRanges(plan, d.blocks.length);
  const [selected, setSelected] = useState(0);
  const sel = Math.min(selected, Math.max(0, d.blocks.length - 1));
  const focusFrom = ranges[sel]?.from ?? 1;

  return (
    <Page title={d.name} back={{ href: tabHref('designer'), label: 'Designer' }}>
      <ModeSwitch editHref={tabHref('designer', d.id)} crochetHref={tabHref('designer', d.id, 'crochet')} mode="edit" />

      <section className="card" aria-label="Preview">
        <div className="preview-grid">
          <div>
            <h2>The whole piece</h2>
            <PiecePreview
              design={d}
              plan={plan}
              size={size}
              maxHeight={360}
              label={`Picture of the whole piece, about ${formatCm(size.widthCm)} by ${formatCm(size.heightCm)}`}
            />
            <p className="muted small" data-testid="design-size">
              About {formatCm(size.widthCm)} × {formatCm(size.heightCm)} · {plan.rows.length} rows · row 1 at the bottom
            </p>
          </div>
          <div>
            <h2>Close-up</h2>
            <CloseUp design={d} plan={plan} from={focusFrom} label={`Close-up of rows from row ${focusFrom}`} />
            <p className="muted small">
              {plan.rows.length ? `From row ${focusFrom} (block ${sel + 1}). Tap a block below to see its rows.` : ''}
            </p>
          </div>
        </div>
      </section>

      {plan.problems.map((p, i) => (
        <div key={i} className={`note ${p.kind === 'empty' ? '' : 'error'}`} role="status">
          <p>{p.message}</p>
          {p.suggest && p.suggest.length > 0 && (
            <div className="actions">
              {p.suggest.map((w) => (
                <button key={w} type="button" className="btn" onClick={() => update((x) => ({ ...x, width: w }), { undoable: true })}>
                  Use {w} stitches
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <RowsCard d={d} s={s} ranges={ranges} selected={sel} onSelect={setSelected} total={plan.rows.length} />
      <WidthCard d={d} update={update} widthCm={size.widthCm} chain={plan.chain} patterns={plan.patterns} />
      <ColorsCard d={d} update={update} />
      <GaugeCard d={d} update={update} yarn={yarn} />
      <DesignActions s={s} />
    </Page>
  );
}

function RowsCard({
  d,
  s,
  ranges,
  selected,
  onSelect,
  total,
}: {
  d: DesignContent;
  s: ReadyDesign;
  ranges: ({ from: number; to: number } | null)[];
  selected: number;
  onSelect: (i: number) => void;
  total: number;
}) {
  const { update, undo, canUndo } = s;
  const setBlocks = (fn: (blocks: DesignBlock[]) => DesignBlock[]) => update((x) => ({ ...x, blocks: fn(x.blocks) }), { undoable: true });
  const last = d.blocks.at(-1)?.lines.at(-1);

  return (
    <Card title="Rows" id="rows">
      <div className="toolbar">
        <button type="button" className="btn" disabled={!canUndo} onClick={undo}>
          Undo
        </button>
        <span className="muted">{total} rows in all</span>
      </div>
      {d.blocks.map((b, bi) => (
        <BlockEditor
          key={b.id}
          d={d}
          block={b}
          index={bi}
          range={ranges[bi] ?? null}
          selected={bi === selected}
          onSelect={() => onSelect(bi)}
          setBlocks={setBlocks}
        />
      ))}
      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setBlocks((blocks) => [...blocks, newBlock([newLine(last?.stitch ?? 'sc', last?.color ?? 0, 2)])]);
            onSelect(d.blocks.length);
          }}
        >
          + Add a block
        </button>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={d.rightSideFirst}
          onChange={(e) => update((x) => ({ ...x, rightSideFirst: e.target.checked }), { undoable: true })}
        />
        <span>Row 1 is worked with the right side facing</span>
      </label>
      <p className="hint">
        A block is one or more row lines that can repeat: "rows 3–6 × 10" is a block of 4 rows repeated 10 times. A
        stitch pattern carries on across color changes, and starts over when the stitch changes.
      </p>
    </Card>
  );
}

function BlockEditor({
  d,
  block,
  index,
  range,
  selected,
  onSelect,
  setBlocks,
}: {
  d: DesignContent;
  block: DesignBlock;
  index: number;
  range: { from: number; to: number } | null;
  selected: boolean;
  onSelect: () => void;
  setBlocks: (fn: (blocks: DesignBlock[]) => DesignBlock[]) => void;
}) {
  const terms = useTerms();
  const perRep = block.lines.reduce((sum, l) => sum + l.rows, 0);
  const setBlock = (fn: (b: DesignBlock) => DesignBlock) => setBlocks((blocks) => blocks.map((b, i) => (i === index ? fn(b) : b)));
  const setLine = (li: number, patch: Partial<DesignLine>) =>
    setBlock((b) => ({ ...b, lines: b.lines.map((l, i) => (i === li ? { ...l, ...patch } : l)) }));
  const move = (dir: -1 | 1) =>
    setBlocks((blocks) => {
      const out = blocks.slice();
      const j = index + dir;
      [out[index], out[j]] = [out[j]!, out[index]!];
      return out;
    });

  return (
    <section
      className={`block${selected ? ' selected' : ''}`}
      aria-label={`Block ${index + 1}`}
      onClickCapture={onSelect}
      onFocusCapture={onSelect}
    >
      <header className="block-head">
        <div>
          <strong>{range ? (range.from === range.to ? `Row ${range.from}` : `Rows ${range.from}–${range.to}`) : 'No rows'}</strong>{' '}
          <span className="muted">
            · {perRep} {perRep === 1 ? 'row' : 'rows'}
            {block.times > 1 ? ` × ${block.times}` : ''}
          </span>
        </div>
        <div className="block-tools">
          <button type="button" className="icon-btn" aria-label="Move block up" disabled={index === 0} onClick={() => move(-1)}>
            ↑
          </button>
          <button type="button" className="icon-btn" aria-label="Move block down" disabled={index === d.blocks.length - 1} onClick={() => move(1)}>
            ↓
          </button>
          <button type="button" className="icon-btn" aria-label="Delete block" onClick={() => setBlocks((blocks) => blocks.filter((_, i) => i !== index))}>
            ×
          </button>
        </div>
      </header>
      {block.lines.map((l, li) => {
        const plain = designPattern(l.stitch)?.plain;
        return (
          <div key={l.id} className="line" aria-label={`Row line ${li + 1}`} role="group">
            <Stepper label="Rows" value={l.rows} min={1} max={MAX_LINE_ROWS} onChange={(rows) => setLine(li, { rows })} />
            <label className="field stitch-field">
              <span>Stitch</span>
              <select
                value={l.stitch}
                onChange={(e) => setLine(li, { stitch: e.target.value, loop: designPattern(e.target.value)?.plain ? l.loop : 'both' })}
              >
                {DESIGN_STITCH_IDS.map((id) => (
                  <option key={id} value={id}>
                    {stitchLabel(id, terms)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field color-field">
              <span>Color</span>
              <span className="with-dot">
                <Dot hex={d.colors[l.color]?.hex ?? '#888888'} />
                <select value={l.color} onChange={(e) => setLine(li, { color: Number(e.target.value) })}>
                  {d.colors.map((c, ci) => (
                    <option key={ci} value={ci}>
                      {c.name || `Color ${ci + 1}`}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            {plain ? (
              <label className="field loop-field">
                <span>Loop</span>
                <select value={l.loop} onChange={(e) => setLine(li, { loop: e.target.value as Loop })}>
                  {(Object.keys(LOOP_LABELS) as Loop[]).map((k) => (
                    <option key={k} value={k}>
                      {LOOP_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="loop-field" />
            )}
            <button
              type="button"
              className="icon-btn line-remove"
              aria-label="Remove this row line"
              onClick={() =>
                block.lines.length > 1
                  ? setBlock((b) => ({ ...b, lines: b.lines.filter((_, i) => i !== li) }))
                  : setBlocks((blocks) => blocks.filter((_, i) => i !== index))
              }
            >
              ×
            </button>
          </div>
        );
      })}
      <div className="block-foot">
        <button
          type="button"
          className="btn"
          onClick={() => {
            const lastLine = block.lines.at(-1)!;
            setBlock((b) => ({ ...b, lines: [...b.lines, newLine(lastLine.stitch, (lastLine.color + 1) % d.colors.length, lastLine.rows)] }));
          }}
        >
          + Add a row line
        </button>
        <Stepper
          label="Repeat this block"
          value={block.times}
          min={1}
          max={MAX_TIMES}
          suffix="times"
          onChange={(times) => setBlock((b) => ({ ...b, times }))}
        />
      </div>
    </section>
  );
}

function WidthCard({
  d,
  update,
  widthCm,
  chain,
  patterns,
}: {
  d: DesignContent;
  update: Update;
  widthCm: number;
  chain: number | null;
  patterns: ReturnType<typeof useDesignFacts>['plan']['patterns'];
}) {
  const terms = useTerms();
  return (
    <Card title="Width" id="width">
      <div className="fields">
        <NumberField
          label="Stitches across"
          value={d.width}
          min={2}
          max={MAX_WIDTH}
          testId="width-stitches"
          onChange={(v) => v && update((x) => ({ ...x, width: v }), { undoable: true })}
        />
        <NumberField
          label="Or width in cm"
          value={Math.round(widthCm * 10) / 10}
          min={1}
          max={500}
          decimals={1}
          onChange={(cm) => cm && update((x) => ({ ...x, width: Math.min(MAX_WIDTH, widthFromCm(x, cm)) }), { undoable: true })}
        />
      </div>
      <p>
        About {formatCm(widthCm)} wide with your gauge.
        {chain ? ` Start with a chain of ${chain}.` : ''}
      </p>
      {patterns.length > 0 && (
        <ul className="fit-list">
          {patterns.map((p) => (
            <li key={p.id} className={p.fits(d.width) ? 'ok' : 'bad'}>
              <span aria-hidden="true">{p.fits(d.width) ? '✓' : '✗'}</span> {stitchLabel(p.id, terms)}: {p.fitText}
            </li>
          ))}
        </ul>
      )}
      <p className="hint">Count each chain space as a stitch. Changing the cm changes the stitches, using your gauge.</p>
    </Card>
  );
}

function ColorsCard({ d, update }: { d: DesignContent; update: Update }) {
  const setColor = (i: number, patch: { name?: string; hex?: string }) =>
    update((x) => ({ ...x, colors: x.colors.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  return (
    <Card title="Colors" id="colors">
      <div className="palette">
        {d.colors.map((c, i) => (
          <div key={i} className="color-row">
            <input type="color" value={c.hex} aria-label={`Shade of ${c.name || `color ${i + 1}`}`} onChange={(e) => setColor(i, { hex: e.target.value })} />
            <input
              type="text"
              value={c.name}
              maxLength={24}
              placeholder="Name this color"
              aria-label={`Name of color ${i + 1}`}
              onChange={(e) => setColor(i, { name: e.target.value })}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${c.name || `color ${i + 1}`}`}
              disabled={d.colors.length <= 1}
              onClick={() => update((x) => removeDesignColor(x, i), { undoable: true })}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="actions">
        <button
          type="button"
          className="btn"
          disabled={d.colors.length >= MAX_COLORS}
          onClick={() =>
            update(
              (x) => {
                const used = new Set(x.colors.map((c) => c.hex.toLowerCase()));
                const next = DESIGN_COLORS.find((c) => !used.has(c.hex)) ?? { name: '', hex: '#888888' };
                return { ...x, colors: [...x.colors, { ...next }] };
              },
              { undoable: true },
            )
          }
        >
          + Add color
        </button>
      </div>
    </Card>
  );
}

function GaugeCard({ d, update, yarn }: { d: DesignContent; update: Update; yarn: ReturnType<typeof useDesignFacts>['yarn'] }) {
  const terms = useTerms();
  const setGauge = (patch: Partial<DesignContent['gauge']>) => update((x) => ({ ...x, gauge: { ...x.gauge, ...patch } }));
  const setYarn = (patch: Partial<DesignContent['yarn']>) => update((x) => ({ ...x, yarn: { ...x.yarn, ...patch } }));
  const used = d.colors.map((c, i) => ({ c, i })).filter(({ i }) => (yarn.meters[i] ?? 0) > 0);
  return (
    <Card title="Gauge and yarn" id="gauge">
      <p className="hint">
        Crochet a swatch a bit bigger than 10 × 10 cm with your yarn and hook, then count how many stitches and rows fit
        in 10 cm.
      </p>
      <label className="field">
        <span>Swatch stitch</span>
        <select value={d.gauge.stitch} onChange={(e) => setGauge({ stitch: e.target.value })}>
          {DESIGN_STITCH_IDS.map((id) => (
            <option key={id} value={id}>
              {stitchLabel(id, terms)}
            </option>
          ))}
        </select>
      </label>
      <div className="fields">
        <NumberField label="Stitches per 10 cm" value={d.gauge.sts} min={1} max={100} decimals={1} onChange={(v) => v && setGauge({ sts: v })} />
        <NumberField label="Rows per 10 cm" value={d.gauge.rows} min={1} max={100} decimals={1} onChange={(v) => v && setGauge({ rows: v })} />
      </div>
      <div className="fields">
        <NumberField label="Meters per ball" value={d.yarn.metersPerBall} min={1} max={5000} onChange={(v) => v && setYarn({ metersPerBall: v })} />
        <NumberField label="Grams per ball" value={d.yarn.gramsPerBall} min={1} max={2000} onChange={(v) => v && setYarn({ gramsPerBall: v })} />
        <NumberField
          label="Swatch weight (optional)"
          value={d.yarn.swatchGrams}
          min={0.1}
          max={1000}
          decimals={1}
          suffix="g"
          testId="swatch-grams"
          onChange={(v) => setYarn({ swatchGrams: v })}
        />
      </div>
      {used.length > 0 && (
        <table className="yarn-table">
          <thead>
            <tr>
              <th scope="col">Color</th>
              <th scope="col">Meters</th>
              <th scope="col">Balls</th>
            </tr>
          </thead>
          <tbody>
            {used.map(({ c, i }) => (
              <tr key={i}>
                <td>
                  <Dot hex={c.hex} />
                  {c.name || `Color ${i + 1}`}
                </td>
                <td>{Math.round(yarn.meters[i]!)} m</td>
                <td>{yarn.balls[i]}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>All</td>
              <td>{Math.round(yarn.totalMeters)} m</td>
              <td>{yarn.balls.reduce((a, b) => a + b, 0)}</td>
            </tr>
          </tfoot>
        </table>
      )}
      <p className={yarn.rough ? 'note' : 'muted small'} data-testid="yarn-basis">
        {yarn.rough
          ? 'Rough estimate. For a better one, weigh your 10 × 10 cm swatch on a kitchen scale and enter its weight.'
          : `From your weighed swatch. The ball count includes ${Math.round(SPARE * 100)}% extra.`}
      </p>
    </Card>
  );
}

function DesignActions({ s }: { s: ReadyDesign }) {
  const { value: d, update, flush } = s;
  const [confirm, setConfirm] = useState(false);
  return (
    <Card title="This design" id="this-design">
      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={d.name}
          maxLength={60}
          onChange={(e) => update((x) => ({ ...x, name: e.target.value }))}
          onBlur={() => {
            if (!d.name.trim()) update((x) => ({ ...x, name: 'Untitled' }));
          }}
        />
      </label>
      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={async () => {
            await flush();
            const copy = await duplicateDesign(d);
            window.location.hash = tabHref('designer', copy.id);
          }}
        >
          Duplicate
        </button>
      </div>
      {confirm ? (
        <div className="note error">
          <p>Move “{d.name}” to the Trash? You can restore it from Settings.</p>
          <div className="actions">
            <button
              type="button"
              className="btn danger"
              onClick={async () => {
                await flush();
                await trashDesign(d.id);
                window.location.hash = tabHref('designer');
              }}
            >
              Move to Trash
            </button>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="actions">
          <button type="button" className="btn danger" onClick={() => setConfirm(true)}>
            Delete design
          </button>
        </div>
      )}
    </Card>
  );
}
