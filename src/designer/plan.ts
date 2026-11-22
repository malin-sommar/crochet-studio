import { getStitch } from '../stitches/data';
import type { DesignContent } from './model';
import { DESIGN_PATTERNS, designPattern, nearestFits, repeats, type DesignPattern, type Loop, type RowSpec } from './patterns';

/** At most this many rows are planned (a very big blanket is still far below this). */
export const MAX_ROWS = 3000;

export interface PlannedRow {
  /** Row number, 1 = the first row, worked into the chain. */
  n: number;
  stitch: string;
  color: number;
  loop: Loop;
  /** Where it comes from: block and line index, and which repeat of the block (all from 0). */
  block: number;
  line: number;
  rep: number;
  kind: 'foundation' | 'first' | 'cycle';
  /** For cycle rows, which of the pattern's cycle rows (from 0); -1 otherwise. */
  cycleIndex: number;
  spec: RowSpec;
  /** Times the repeat is worked, or null if the width doesn't fit this stitch. */
  r: number | null;
  belowHasSpaces: boolean;
  side: 'RS' | 'WS';
}

export interface Problem {
  kind: 'width' | 'side' | 'empty' | 'tooLong';
  message: string;
  stitch?: string;
  /** Widths that would fit every stitch in the design. */
  suggest?: number[];
  rows?: number[];
}

export interface Plan {
  rows: PlannedRow[];
  /** The starting chain, or null if the first stitch doesn't fit the width. */
  chain: number | null;
  problems: Problem[];
  /** The designer's patterns used, in order of first use. */
  patterns: DesignPattern[];
}

export function stitchName(id: string): string {
  return getStitch(id)?.names.us.name ?? id;
}

/** Turns the blocks into numbered rows, works out each row's instructions and checks the design. */
export function planDesign(d: DesignContent): Plan {
  const rows: PlannedRow[] = [];
  const problems: Problem[] = [];
  let tooLong = false;
  let prev: { stitch: string; cyclePos: number; hasSpaces: boolean } | null = null;

  outer: for (let b = 0; b < d.blocks.length; b++) {
    const block = d.blocks[b]!;
    for (let rep = 0; rep < block.times; rep++) {
      for (let l = 0; l < block.lines.length; l++) {
        const line = block.lines[l]!;
        const p = designPattern(line.stitch);
        if (!p) continue;
        for (let i = 0; i < line.rows; i++) {
          if (rows.length >= MAX_ROWS) {
            tooLong = true;
            break outer;
          }
          const n = rows.length + 1;
          let kind: PlannedRow['kind'];
          let spec: RowSpec;
          let cyclePos = 0;
          let cycleIndex = -1;
          if (!prev) {
            kind = 'foundation';
            spec = p.foundation;
          } else if (prev.stitch !== line.stitch) {
            kind = 'first';
            spec = p.first;
          } else {
            kind = 'cycle';
            cyclePos = prev.cyclePos;
            cycleIndex = cyclePos % p.cycle.length;
            spec = p.cycle[cycleIndex]!;
            cyclePos++;
          }
          const odd = n % 2 === 1;
          rows.push({
            n,
            stitch: line.stitch,
            color: line.color,
            loop: p.plain ? line.loop : 'both',
            block: b,
            line: l,
            rep,
            kind,
            cycleIndex,
            spec,
            r: p.fits(d.width) ? repeats(spec, d.width) : null,
            belowHasSpaces: prev?.hasSpaces ?? false,
            side: odd === d.rightSideFirst ? 'RS' : 'WS',
          });
          prev = { stitch: line.stitch, cyclePos, hasSpaces: !!spec.hasSpaces };
        }
      }
    }
  }

  const used = [...new Set(rows.map((r) => r.stitch))].map((id) => designPattern(id)!);
  if (!rows.length) problems.push({ kind: 'empty', message: 'Add some rows to start.' });
  const misfits = used.filter((p) => !p.fits(d.width));
  if (misfits.length) {
    const suggest = nearestFits(used, d.width);
    for (const p of misfits) {
      problems.push({
        kind: 'width',
        stitch: p.id,
        suggest,
        message:
          `${stitchName(p.id)} needs ${p.fitText}, so ${d.width} doesn't fit. ` +
          (suggest.length
            ? `Widths that fit everything in this design: ${suggest.join(' or ')}.`
            : `No width fits all of ${used.map((u) => stitchName(u.id).toLowerCase()).join(', ')} together.`),
      });
    }
  }
  const wrongSide = rows.filter((r) => r.spec.wrongSide && r.side === 'RS').map((r) => r.n);
  if (wrongSide.length) {
    problems.push({
      kind: 'side',
      rows: wrongSide,
      message:
        `Bobbles pop out on the side facing away from you, so on row${wrongSide.length > 1 ? 's' : ''} ` +
        `${listRows(wrongSide)} they would show on the back. Add or remove one row before the bobbles, ` +
        'or change which side of row 1 is the right side.',
    });
  }
  if (tooLong) problems.push({ kind: 'tooLong', message: `Only the first ${MAX_ROWS} rows are shown. That's longer than any scarf or blanket needs.` });

  const first = rows[0];
  const firstPattern = first && designPattern(first.stitch);
  const chain = firstPattern && firstPattern.fits(d.width) ? d.width + firstPattern.chainExtra : null;
  return { rows, chain, problems, patterns: used };
}

/** "3, 5, 7 and 9" (shortened if there are many). */
export function listRows(ns: number[]): string {
  const shown = ns.slice(0, 6);
  const more = ns.length - shown.length;
  if (more > 0) return `${shown.join(', ')} and ${more} more`;
  if (shown.length === 1) return String(shown[0]);
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

/** The instructions for one row (with {tokens}), or null if the width doesn't fit its stitch. */
export function rowInstructions(row: PlannedRow, width: number): string | null {
  if (row.r === null) return null;
  return row.spec.text({ n: width, r: row.r, loop: row.loop, belowHasSpaces: row.belowHasSpaces });
}

/** The first and last row number of each block's repeats: "Rows 3–42". */
export function blockRanges(plan: Plan, blocks: number): ({ from: number; to: number } | null)[] {
  const out: ({ from: number; to: number } | null)[] = Array.from({ length: blocks }, () => null);
  for (const r of plan.rows) {
    const cur = out[r.block];
    out[r.block] = cur ? { from: cur.from, to: r.n } : { from: r.n, to: r.n };
  }
  return out;
}

export const DESIGN_STITCH_IDS = DESIGN_PATTERNS.map((p) => p.id);
