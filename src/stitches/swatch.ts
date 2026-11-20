/**
 * Drawing a small swatch of a stitch pattern. Pure geometry: the result is a list of simple
 * shapes, painted as SVG in the stitch library (and on a canvas by the scarf and blanket maker).
 *
 * A swatch is rows of stitches, bottom row first. Every stitch is a "post" from where it sits on
 * the row below (its base) to where its top ends up, so increases fan out, decreases lean in and
 * shells spread, just as they do in fabric.
 */

export type GlyphKind = 'sc' | 'hdc' | 'dc' | 'tr' | 'sl' | 'puff' | 'bobble';

export type SwatchItem =
  /** One stitch, `w` units wide (default 1). */
  | { k: GlyphKind; w?: number }
  /** `n` stitches worked into one stitch, their tops spread over `w` units (increase, V, shell). */
  | { fan: GlyphKind; n: number; w: number }
  /** `n` stitches, `w` units apart at the bottom, joined into one top (decrease). */
  | { join: GlyphKind; n: number; w: number }
  /** A chain arching over a space, `w` units wide. */
  | { gap: number }
  /** Empty room, `w` units wide. */
  | { space: number };

export interface SwatchRow {
  items: SwatchItem[];
  /** Repeat the items across the whole width (otherwise the row is centred). */
  fill?: boolean;
  /** Fill rows: start this many units to the left, so rows can sit between each other. */
  offset?: number;
  /** Show the unused front loops of the row below as a ridge (back loop only). */
  ridge?: boolean;
}

export type SwatchSpec =
  | { layout: 'rows'; width: number; setup?: SwatchRow[]; cycle: SwatchRow[]; count: number }
  | { layout: 'chain'; links: number }
  | { layout: 'round'; rounds: number[] };

export type Shape =
  | { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rot?: number; fill?: string; stroke?: string; sw?: number }
  | { t: 'path'; d: string; fill?: string; stroke?: string; sw?: number }
  | { t: 'group'; x: number; y: number; rot: number; children: Shape[] };

export interface Swatch {
  width: number;
  height: number;
  shapes: Shape[];
}

/** Pixels per unit (one stitch width) in the drawing's own coordinates. */
export const UNIT = 24;

/** How tall each kind of stitch is, in units (an sc is about as tall as it is wide). */
export const GLYPH_HEIGHT: Record<GlyphKind, number> = {
  sl: 0.55,
  sc: 1,
  hdc: 1.45,
  dc: 2,
  tr: 2.6,
  puff: 1.8,
  bobble: 1,
};

// ---------- Colors ----------

function mix(hex: string, other: string, amount: number): string {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(other.slice(i, i + 2), 16));
  return (
    '#' +
    a
      .map((v, i) => Math.round(v + (b[i]! - v) * amount))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

interface Palette {
  base: string;
  dark: string;
  light: string;
}

function palette(hex: string, rowShade = 0): Palette {
  const base = rowShade ? mix(hex, '#000000', rowShade) : hex;
  return { base, dark: mix(hex, '#000000', 0.42), light: mix(base, '#ffffff', 0.28) };
}

const f = (n: number) => Math.round(n * 100) / 100;

// ---------- One stitch, drawn upright with its base at (0, 0) ----------

function glyph(kind: GlyphKind, len: number, wid: number, p: Palette): Shape[] {
  const hw = wid / 2;
  const sw = Math.max(1, wid * 0.06);
  const out: Shape[] = [];
  const topV = (y: number) => {
    const rx = hw * 0.55;
    const ry = Math.min(wid * 0.2, len * 0.22);
    out.push(
      { t: 'ellipse', cx: f(-hw * 0.4), cy: f(y), rx: f(rx), ry: f(ry), rot: -28, fill: p.light, stroke: p.dark, sw },
      { t: 'ellipse', cx: f(hw * 0.4), cy: f(y), rx: f(rx), ry: f(ry), rot: 28, fill: p.light, stroke: p.dark, sw },
    );
  };
  const post = (bodyW: number, top: number) => {
    const r = Math.min(bodyW / 2, 6);
    const x = -bodyW / 2;
    out.push({
      t: 'path',
      d: `M${f(x)} ${f(-r)} L${f(x)} ${f(top + r)} Q${f(x)} ${f(top)} ${f(x + r)} ${f(top)} L${f(-x - r)} ${f(top)} Q${f(-x)} ${f(top)} ${f(-x)} ${f(top + r)} L${f(-x)} ${f(-r)} Q${f(-x)} 0 ${f(-x - r)} 0 L${f(x + r)} 0 Q${f(x)} 0 ${f(x)} ${f(-r)} Z`,
      fill: p.base,
      stroke: p.dark,
      sw,
    });
  };
  const wrap = (y0: number, y1: number, bodyW: number) => {
    out.push(
      { t: 'path', d: `M${f(-bodyW / 2)} ${f(y0)} L${f(bodyW / 2)} ${f(y1)}`, stroke: p.dark, sw: sw * 2.6 },
      { t: 'path', d: `M${f(-bodyW / 2)} ${f(y0)} L${f(bodyW / 2)} ${f(y1)}`, stroke: p.light, sw: sw * 1.2 },
    );
  };
  const vY = -len + Math.min(wid * 0.2, len * 0.22) * 1.25;

  switch (kind) {
    case 'sl':
      out.push({ t: 'ellipse', cx: 0, cy: f(-len * 0.5), rx: f(hw * 0.9), ry: f(len * 0.42), fill: p.base, stroke: p.dark, sw });
      out.push({ t: 'path', d: `M${f(-hw * 0.5)} ${f(-len * 0.5)} L${f(hw * 0.5)} ${f(-len * 0.5)}`, stroke: p.light, sw });
      break;
    case 'sc':
      post(wid * 0.72, -len * 0.82);
      topV(vY);
      break;
    case 'hdc':
      post(wid * 0.62, -len * 0.84);
      out.push({ t: 'path', d: `M${f(-wid * 0.31)} ${f(-len * 0.52)} L${f(wid * 0.31)} ${f(-len * 0.52)}`, stroke: p.dark, sw: sw * 2 });
      topV(vY);
      break;
    case 'dc':
      post(wid * 0.5, -len * 0.86);
      wrap(-len * 0.34, -len * 0.54, wid * 0.5);
      topV(vY);
      break;
    case 'tr':
      post(wid * 0.48, -len * 0.88);
      wrap(-len * 0.28, -len * 0.42, wid * 0.48);
      wrap(-len * 0.5, -len * 0.64, wid * 0.48);
      topV(vY);
      break;
    case 'puff': {
      out.push({ t: 'ellipse', cx: 0, cy: f(-len * 0.48), rx: f(hw * 0.95), ry: f(len * 0.44), fill: p.base, stroke: p.dark, sw });
      for (const dx of [-0.5, 0, 0.5]) {
        out.push({
          t: 'path',
          d: `M${f(dx * hw * 0.6)} ${f(-len * 0.08)} Q${f(dx * hw * 1.7)} ${f(-len * 0.5)} 0 ${f(-len * 0.9)}`,
          stroke: p.light,
          sw: sw * 1.4,
        });
      }
      out.push({ t: 'ellipse', cx: 0, cy: f(-len * 0.92), rx: f(hw * 0.35), ry: f(hw * 0.2), fill: p.light, stroke: p.dark, sw });
      break;
    }
    case 'bobble': {
      const r = Math.min(hw * 1.15, len * 0.62);
      out.push({ t: 'ellipse', cx: 0, cy: f(-len * 0.5), rx: f(r), ry: f(r), fill: p.base, stroke: p.dark, sw: sw * 1.2 });
      out.push({ t: 'ellipse', cx: f(-r * 0.3), cy: f(-len * 0.5 - r * 0.35), rx: f(r * 0.38), ry: f(r * 0.24), rot: -30, fill: p.light });
      break;
    }
  }
  return out;
}

/** A stitch from a base point to a top point, leaning as needed. */
function postBetween(kind: GlyphKind, bx: number, by: number, tx: number, ty: number, wid: number, p: Palette): Shape {
  const dx = tx - bx;
  const dy = by - ty;
  const len = Math.hypot(dx, dy);
  const rot = (Math.atan2(dx, dy) * 180) / Math.PI;
  return { t: 'group', x: f(bx), y: f(by), rot: f(rot), children: glyph(kind, len, wid, p) };
}

function chainArc(x0: number, x1: number, y: number, h: number, p: Palette): Shape[] {
  const mid = (x0 + x1) / 2;
  const d = `M${f(x0)} ${f(y)} Q${f(mid)} ${f(y + h * 0.35)} ${f(x1)} ${f(y)}`;
  return [
    { t: 'path', d, stroke: p.dark, sw: f(UNIT * 0.32) },
    { t: 'path', d, stroke: p.base, sw: f(UNIT * 0.2) },
  ];
}

// ---------- Rows ----------

/** Width at the bottom (where it sits) and at the top (where its tops are) of an item, in units. */
function itemWidths(it: SwatchItem): { base: number; top: number } {
  if ('k' in it) return { base: it.w ?? 1, top: it.w ?? 1 };
  if ('fan' in it) return { base: 1, top: it.w };
  if ('join' in it) return { base: it.w, top: 1 };
  if ('gap' in it) return { base: it.gap, top: it.gap };
  return { base: it.space, top: it.space };
}

export function rowHeight(row: SwatchRow): number {
  let h = 0;
  for (const it of row.items) {
    const k = 'k' in it ? it.k : 'fan' in it ? it.fan : 'join' in it ? it.join : null;
    if (k) h = Math.max(h, GLYPH_HEIGHT[k]);
  }
  return h || GLYPH_HEIGHT.sc;
}

function rowsOf(spec: Extract<SwatchSpec, { layout: 'rows' }>): SwatchRow[] {
  const rows = [...(spec.setup ?? [])];
  for (let i = 0; rows.length < spec.count; i++) rows.push(spec.cycle[i % spec.cycle.length]!);
  return rows.slice(0, spec.count);
}

function drawRows(spec: Extract<SwatchSpec, { layout: 'rows' }>, color: string): Swatch {
  const rows = rowsOf(spec);
  const W = spec.width * UNIT;
  const gapY = UNIT * 0.06;
  const H = rows.reduce((s, r) => s + rowHeight(r) * UNIT * 0.92 + gapY, 0) + UNIT * 0.3;
  const shapes: Shape[] = [];
  let bottom = H - UNIT * 0.15;

  rows.forEach((row, ri) => {
    const h = rowHeight(row) * UNIT * 0.92;
    const top = bottom - h;
    // Rows worked back and forth show the front and back of the stitches in turn
    const p = palette(color, ri % 2 ? 0.07 : 0);
    const items: SwatchItem[] = [];
    let startBase: number;
    let startTop: number;
    if (row.fill) {
      const unitW = row.items.reduce((s, it) => s + itemWidths(it).top, 0);
      const offset = row.offset ?? 0;
      const reps = Math.ceil((spec.width + offset + unitW) / unitW) + 1;
      for (let i = 0; i < reps; i++) items.push(...row.items);
      startBase = startTop = -offset * UNIT;
    } else {
      items.push(...row.items);
      const baseW = items.reduce((s, it) => s + itemWidths(it).base, 0);
      const topW = items.reduce((s, it) => s + itemWidths(it).top, 0);
      startBase = (W - baseW * UNIT) / 2;
      startTop = (W - topW * UNIT) / 2;
    }

    let xb = startBase;
    let xt = startTop;
    for (const it of items) {
      const { base, top: topW } = itemWidths(it);
      const b0 = xb;
      const t0 = xt;
      xb += base * UNIT;
      xt += topW * UNIT;
      if ('space' in it) continue;
      if ('gap' in it) {
        shapes.push(...chainArc(t0, xt, top + h * 0.12, h, p));
        continue;
      }
      if ('k' in it) {
        const kh = GLYPH_HEIGHT[it.k] * UNIT * 0.92;
        shapes.push(postBetween(it.k, (b0 + xb) / 2, bottom, (t0 + xt) / 2, bottom - kh, (it.w ?? 1) * UNIT * 0.86, p));
      } else if ('fan' in it) {
        const kh = GLYPH_HEIGHT[it.fan] * UNIT * 0.92;
        const bx = (b0 + xb) / 2;
        const step = (xt - t0) / it.n;
        for (let i = 0; i < it.n; i++) {
          shapes.push(postBetween(it.fan, bx, bottom, t0 + step * (i + 0.5), bottom - kh, UNIT * 0.8, p));
        }
      } else {
        const kh = GLYPH_HEIGHT[it.join] * UNIT * 0.92;
        const tx = (t0 + xt) / 2;
        const step = (xb - b0) / it.n;
        for (let i = 0; i < it.n; i++) {
          shapes.push(postBetween(it.join, b0 + step * (i + 0.5), bottom, tx, bottom - kh, UNIT * 0.7, p));
        }
      }
    }
    if (row.ridge) {
      const y = bottom + gapY / 2;
      shapes.push({
        t: 'path',
        d: `M0 ${f(y)} L${f(W)} ${f(y)}`,
        stroke: p.dark,
        sw: f(UNIT * 0.24),
      });
      shapes.push({ t: 'path', d: `M0 ${f(y)} L${f(W)} ${f(y)}`, stroke: p.light, sw: f(UNIT * 0.12) });
    }
    bottom = top - gapY;
  });
  return { width: W, height: f(H), shapes };
}

function drawChain(links: number, color: string): Swatch {
  const p = palette(color);
  const W = (links + 1) * UNIT * 0.9;
  const H = UNIT * 1.6;
  const shapes: Shape[] = [];
  for (let i = 0; i < links; i++) {
    const cx = UNIT * 0.9 * (i + 1);
    const rot = i % 2 ? 8 : -8;
    shapes.push(
      { t: 'ellipse', cx: f(cx), cy: f(H / 2), rx: f(UNIT * 0.55), ry: f(UNIT * 0.32), rot, stroke: p.dark, sw: f(UNIT * 0.26) },
      { t: 'ellipse', cx: f(cx), cy: f(H / 2), rx: f(UNIT * 0.55), ry: f(UNIT * 0.32), rot, stroke: p.base, sw: f(UNIT * 0.14) },
    );
  }
  return { width: f(W), height: f(H), shapes };
}

function drawRound(rounds: number[], color: string): Swatch {
  const ringR = UNIT * 0.35;
  const step = UNIT * 0.95;
  const R = ringR + step * rounds.length + UNIT * 0.4;
  const c = R;
  const shapes: Shape[] = [
    { t: 'ellipse', cx: f(c), cy: f(c), rx: f(ringR), ry: f(ringR), stroke: palette(color).dark, sw: f(UNIT * 0.16) },
  ];
  rounds.forEach((n, ri) => {
    const p = palette(color, ri % 2 ? 0.07 : 0);
    const r0 = ringR + step * ri;
    const r1 = r0 + step;
    const wid = Math.min(UNIT * 0.86, ((2 * Math.PI * (r0 + r1)) / 2 / n) * 0.9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2 + (ri % 2 ? Math.PI / n : 0);
      shapes.push(
        postBetween('sc', c + Math.cos(a) * r0, c + Math.sin(a) * r0, c + Math.cos(a) * r1, c + Math.sin(a) * r1, wid, p),
      );
    }
  });
  return { width: f(2 * R), height: f(2 * R), shapes };
}

/** The drawing of a swatch in a yarn color (#rrggbb). */
export function drawSwatch(spec: SwatchSpec, color: string): Swatch {
  if (spec.layout === 'chain') return drawChain(spec.links, color);
  if (spec.layout === 'round') return drawRound(spec.rounds, color);
  return drawRows(spec, color);
}

/** Yarn colors to show swatches in. */
export const SWATCH_COLORS: readonly { name: string; hex: string }[] = [
  { name: 'Cream', hex: '#efe4cf' },
  { name: 'Sage', hex: '#9fb39a' },
  { name: 'Mustard', hex: '#d4a017' },
  { name: 'Burgundy', hex: '#8c1d3c' },
  { name: 'Navy', hex: '#3a4166' },
];
