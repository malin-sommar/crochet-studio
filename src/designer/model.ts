import type { PaletteColor } from '../charts/model';
import { newId } from '../storage/ids';
import { designPattern, type Loop } from './patterns';

/**
 * A scarf or blanket design: a width, colors, and blocks of rows. A block holds one or more
 * row lines ("2 rows · Moss stitch · Mustard") and repeats a number of times, so
 * "rows 3–6 × 10" is a block of 4 rows repeated 10 times.
 */

export interface DesignLine {
  id: string;
  /** Stitch library id (one of the designer's patterns). */
  stitch: string;
  rows: number;
  /** Index into the design's colors. */
  color: number;
  /** Plain stitches only. */
  loop: Loop;
}

export interface DesignBlock {
  id: string;
  times: number;
  lines: DesignLine[];
}

/** Your swatch: how many stitches and rows fit in 10 cm, worked in this stitch. */
export interface Gauge {
  stitch: string;
  sts: number;
  rows: number;
}

export interface Yarn {
  metersPerBall: number;
  gramsPerBall: number;
  /** What the 10 × 10 cm swatch weighs, for a better yarn estimate. */
  swatchGrams: number | null;
}

export interface DesignContent {
  name: string;
  /** Stitches across, counting each chain space as one. */
  width: number;
  colors: PaletteColor[];
  blocks: DesignBlock[];
  gauge: Gauge;
  yarn: Yarn;
  /** Row 1 is worked with the right side facing. */
  rightSideFirst: boolean;
  cur: number;
  done: number[];
}

export const MAX_COLORS = 8;
export const MAX_WIDTH = 400;
export const MAX_LINE_ROWS = 999;
export const MAX_TIMES = 500;

export const DESIGN_COLORS: readonly PaletteColor[] = [
  { name: 'Cream', hex: '#efe4cf' },
  { name: 'Mustard', hex: '#d4a017' },
  { name: 'Sage', hex: '#9fb39a' },
  { name: 'Burgundy', hex: '#8c1d3c' },
  { name: 'Navy', hex: '#3a4166' },
  { name: 'Rust', hex: '#b5532a' },
  { name: 'Dark green', hex: '#2f4a3a' },
  { name: 'Charcoal', hex: '#3b3638' },
];

export const DEFAULT_GAUGE: Gauge = { stitch: 'sc', sts: 16, rows: 18 };
export const DEFAULT_YARN: Yarn = { metersPerBall: 200, gramsPerBall: 100, swatchGrams: null };

export function newLine(stitch: string, color = 0, rows = 2): DesignLine {
  return { id: newId(), stitch, rows, color, loop: 'both' };
}

export function newBlock(lines: DesignLine[], times = 1): DesignBlock {
  return { id: newId(), times, lines };
}

export function blankDesign(): DesignContent {
  return {
    name: 'New design',
    width: 30,
    colors: DESIGN_COLORS.slice(0, 3).map((c) => ({ ...c })),
    blocks: [newBlock([newLine('sc', 0, 4)])],
    gauge: { ...DEFAULT_GAUGE },
    yarn: { ...DEFAULT_YARN },
    rightSideFirst: true,
    cur: 1,
    done: [],
  };
}

/** A striped moss stitch scarf, to try the designer with. */
export function exampleDesign(): DesignContent {
  return {
    ...blankDesign(),
    name: 'Striped moss scarf',
    width: 30,
    blocks: [
      newBlock([newLine('sc', 0, 2)]),
      newBlock([newLine('moss', 1, 2), newLine('moss', 2, 2), newLine('moss', 0, 2)], 22),
      newBlock([newLine('sc', 0, 2)]),
    ],
  };
}

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const HEX = /^#[0-9a-f]{6}$/i;

/** Reads a saved design defensively: anything missing or out of range gets a safe value. */
export function normalizeDesign(raw: unknown): DesignContent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.blocks) || !Array.isArray(o.colors)) return null;
  const colors = (o.colors as unknown[])
    .slice(0, MAX_COLORS)
    .map((c, i) => {
      const x = (c ?? {}) as Record<string, unknown>;
      return {
        name: typeof x.name === 'string' ? x.name : '',
        hex: typeof x.hex === 'string' && HEX.test(x.hex) ? x.hex : DESIGN_COLORS[i % DESIGN_COLORS.length]!.hex,
      };
    });
  if (!colors.length) colors.push({ ...DESIGN_COLORS[0]! });
  const blocks: DesignBlock[] = [];
  for (const b of o.blocks as unknown[]) {
    const x = (b ?? {}) as Record<string, unknown>;
    if (!Array.isArray(x.lines)) continue;
    const lines: DesignLine[] = [];
    for (const l of x.lines as unknown[]) {
      const y = (l ?? {}) as Record<string, unknown>;
      const stitch = typeof y.stitch === 'string' && designPattern(y.stitch) ? y.stitch : null;
      if (!stitch) continue;
      const plain = designPattern(stitch)!.plain;
      lines.push({
        id: typeof y.id === 'string' && y.id ? y.id : newId(),
        stitch,
        rows: clampInt(y.rows, 1, MAX_LINE_ROWS, 1),
        color: clampInt(y.color, 0, colors.length - 1, 0),
        loop: plain && (y.loop === 'blo' || y.loop === 'flo') ? y.loop : 'both',
      });
    }
    if (lines.length) {
      blocks.push({ id: typeof x.id === 'string' && x.id ? x.id : newId(), times: clampInt(x.times, 1, MAX_TIMES, 1), lines });
    }
  }
  const g = (o.gauge ?? {}) as Record<string, unknown>;
  const y = (o.yarn ?? {}) as Record<string, unknown>;
  const swatch = Number(y.swatchGrams);
  return {
    name: typeof o.name === 'string' && o.name.trim() ? o.name.slice(0, 60) : 'Untitled',
    width: clampInt(o.width, 2, MAX_WIDTH, 30),
    colors,
    blocks,
    gauge: {
      stitch: typeof g.stitch === 'string' && designPattern(g.stitch) ? g.stitch : 'sc',
      sts: Math.min(100, Math.max(1, Number(g.sts) || DEFAULT_GAUGE.sts)),
      rows: Math.min(100, Math.max(1, Number(g.rows) || DEFAULT_GAUGE.rows)),
    },
    yarn: {
      metersPerBall: Math.max(1, Number(y.metersPerBall) || DEFAULT_YARN.metersPerBall),
      gramsPerBall: Math.max(1, Number(y.gramsPerBall) || DEFAULT_YARN.gramsPerBall),
      swatchGrams: Number.isFinite(swatch) && swatch > 0 ? swatch : null,
    },
    rightSideFirst: o.rightSideFirst !== false,
    cur: Math.max(1, Math.round(Number(o.cur)) || 1),
    done: Array.isArray(o.done) ? [...new Set(o.done.map(Number).filter((n) => Number.isInteger(n) && n >= 1))].sort((a, b) => a - b) : [],
  };
}

/** Removes a color; rows in that color become the first color, later colors move up. */
export function removeDesignColor(d: DesignContent, index: number): DesignContent {
  if (d.colors.length <= 1) return d;
  return {
    ...d,
    colors: d.colors.filter((_, i) => i !== index),
    blocks: d.blocks.map((b) => ({
      ...b,
      lines: b.lines.map((l) => ({ ...l, color: l.color === index ? 0 : l.color > index ? l.color - 1 : l.color })),
    })),
  };
}
