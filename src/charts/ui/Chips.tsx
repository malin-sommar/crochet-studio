import { LETTERS, colorLabel, inkOn, type ChartContent } from '../model';
import { mosaicRuns, rowColor } from '../mosaic';
import { tapestryRuns } from '../rows';

/** The stitches of one row as colored blocks, in working order. */
export function RowChips({ chart, n }: { chart: ChartContent; n: number }) {
  if (chart.tech === 'mosaic') {
    const hex = chart.pal[rowColor(chart, n)]!.hex;
    return (
      <div className="runs">
        {mosaicRuns(chart, n).map(([t, k], i) => (
          <span
            key={i}
            className={`run mo-${t}`}
            style={t === 'sc' ? { borderColor: hex } : { background: hex, color: inkOn(hex), borderColor: hex }}
          >
            {k} {t}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="runs">
      {tapestryRuns(chart, n).map(([ci, k], i) => {
        const hex = chart.pal[ci]!.hex;
        return (
          <span key={i} className="run" style={{ background: hex, color: inkOn(hex) }}>
            {k} {LETTERS[ci]}
          </span>
        );
      })}
    </div>
  );
}

export function Dot({ hex }: { hex: string }) {
  return <span className="dot" style={{ background: hex }} aria-hidden="true" />;
}

/** A row in short: "5 A · 3 B" (tapestry) or "3 sc, 1 X" (mosaic). */
export function rowSummary(chart: ChartContent, n: number): string {
  if (chart.tech === 'mosaic') return mosaicRuns(chart, n).map(([t, k]) => `${k} ${t}`).join(', ');
  return tapestryRuns(chart, n)
    .map(([ci, k]) => `${k} ${LETTERS[ci]}`)
    .join(' · ');
}

export function Legend({ chart, only }: { chart: ChartContent; only?: number[] }) {
  const items = only ?? chart.pal.map((_, i) => i);
  return (
    <ul className="legend">
      {items.map((i) => (
        <li key={i}>
          <Dot hex={chart.pal[i]!.hex} />
          {colorLabel(chart, i)}
        </li>
      ))}
    </ul>
  );
}
