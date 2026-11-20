import { addColor, canAddColor, colorCounts, removeColor, setColor } from '../edit';
import { LETTERS, type ChartContent } from '../model';

type Update = (fn: (c: ChartContent) => ChartContent, opts?: { undoable?: boolean }) => void;

/** Quick color choice above the chart: the color you paint with. */
export function ColorPicker({ chart, active, onPick }: { chart: ChartContent; active: number; onPick: (i: number) => void }) {
  return (
    <div className="color-picker" role="radiogroup" aria-label="Paint with">
      {chart.pal.map((p, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={i === active}
          aria-label={`Color ${LETTERS[i]}${p.name ? ` (${p.name})` : ''}`}
          className="swatch-btn"
          onClick={() => onPick(i)}
        >
          <span className="swatch" style={{ background: p.hex }} />
          <span>{LETTERS[i]}</span>
        </button>
      ))}
    </div>
  );
}

/** Names, shades and stitch counts for every color; add and remove colors. */
export function PaletteEditor({
  chart,
  active,
  onPick,
  update,
}: {
  chart: ChartContent;
  active: number;
  onPick: (i: number) => void;
  update: Update;
}) {
  const counts = colorCounts(chart);
  return (
    <div className="palette">
      {chart.pal.map((p, i) => (
        <div key={i} className={`prow${i === active ? ' on' : ''}`}>
          <button
            type="button"
            className="swatch-btn"
            aria-pressed={i === active}
            aria-label={`Paint with color ${LETTERS[i]}`}
            onClick={() => onPick(i)}
          >
            <span className="swatch" style={{ background: p.hex }} />
            <span>{LETTERS[i]}</span>
          </button>
          <input
            type="text"
            value={p.name}
            maxLength={24}
            placeholder={i === 0 ? 'Background' : 'Name this color'}
            aria-label={`Name of color ${LETTERS[i]}`}
            onChange={(e) => update((c) => setColor(c, i, { name: e.target.value }))}
          />
          <input
            type="color"
            value={p.hex}
            aria-label={`Shade of color ${LETTERS[i]}`}
            onChange={(e) => update((c) => setColor(c, i, { hex: e.target.value }))}
          />
          <button
            type="button"
            className="icon-btn"
            aria-label={`Remove color ${LETTERS[i]}`}
            title="Remove this color"
            disabled={chart.pal.length <= 2}
            onClick={() => update((c) => removeColor(c, i), { undoable: true })}
          >
            ×
          </button>
          <div className="muted cnt">
            {counts[i]} stitches{i === 0 ? ' · background' : ''}
          </div>
        </div>
      ))}
      {chart.tech !== 'mosaic' && (
        <div className="actions">
          <button
            type="button"
            className="btn"
            disabled={!canAddColor(chart)}
            onClick={() => update((c) => addColor(c), { undoable: true })}
          >
            + Add color
          </button>
        </div>
      )}
    </div>
  );
}
