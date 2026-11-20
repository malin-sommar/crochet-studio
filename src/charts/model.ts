/**
 * Charts: what one is, how old tracker files and chart codes are read, and how files are written.
 * Ported from the Tapestry Chart Tracker (`../tapestry-tracker/tracker.html`); old files must keep
 * opening unchanged.
 *
 * Cells are strings of digits 0-7, one string per row, top row first. The digit is the palette
 * index; palette entry 0 (color A) is the background. Crochet row 1 is the bottom chart row.
 */

export const MAX_COLORS = 8;
export const MIN_SIZE = 2;
export const MAX_SIZE = 200;
export const LETTERS = 'ABCDEFGH';

export interface PaletteColor {
  name: string;
  hex: string;
}

export type Technique = 'tapestry' | 'mosaic';

export interface ChartContent {
  name: string;
  w: number;
  h: number;
  cells: string[];
  pal: PaletteColor[];
  tech: Technique;
  /** Mosaic only: reversible (anchored stitches), so the back shows the design in swapped colors. */
  rev: boolean;
  /** Mosaic only: palette index (0 or 1) of row 1's color. */
  mfirst: 0 | 1;
  /** The row being crocheted, 1 = bottom row. */
  cur: number;
  /** Rows marked done. */
  done: number[];
}

/** Colors offered when adding a color, in order. */
export const SUGGESTED_COLORS: readonly PaletteColor[] = [
  { name: 'Cream', hex: '#f3ead8' },
  { name: 'Burgundy', hex: '#8c1d3c' },
  { name: 'Dark green', hex: '#2f4a3a' },
  { name: 'Mustard', hex: '#d4a017' },
  { name: 'Navy', hex: '#2b2d3d' },
  { name: 'Rust', hex: '#b5532a' },
  { name: 'Sage', hex: '#9fb39a' },
  { name: 'Black', hex: '#1f1d1f' },
];

/** The two-color presets that the very first tracker versions saved as `pal: "y-burg"` etc. */
const OLD_PRESETS: Record<string, [string, string]> = {
  'y-burg': ['#f3ead8', '#8c1d3c'],
  'y-green': ['#f3ead8', '#2f4a3a'],
  'y-navy': ['#f3ead8', '#2b2d3d'],
  'y-must': ['#f2dc8a', '#5c4033'],
};

export const DEFAULT_PALETTE: readonly PaletteColor[] = [
  { name: 'Cream', hex: '#f3ead8' },
  { name: 'Burgundy', hex: '#8c1d3c' },
];

export const EXAMPLE_HEART: ChartContent = {
  name: 'Example heart',
  w: 15,
  h: 13,
  cells: [
    '000000000000000',
    '000111000111000',
    '001111101111100',
    '011111111111110',
    '011111111111110',
    '011111111111110',
    '001111111111100',
    '000111111111000',
    '000011111110000',
    '000001111100000',
    '000000111000000',
    '000000010000000',
    '000000000000000',
  ],
  pal: DEFAULT_PALETTE.map((c) => ({ ...c })),
  tech: 'tapestry',
  rev: false,
  mfirst: 0,
  cur: 1,
  done: [],
};

/** An error whose message can be shown to the user as it is. */
export class ChartFileError extends Error {
  override name = 'ChartFileError';
}

const HEX = /^#[0-9a-f]{6}$/i;

export function blankChart(w: number, h: number, pal: readonly PaletteColor[] = DEFAULT_PALETTE): ChartContent {
  const cw = clampSize(w);
  const ch = clampSize(h);
  return {
    name: 'New chart',
    w: cw,
    h: ch,
    cells: Array.from({ length: ch }, () => '0'.repeat(cw)),
    pal: pal.map((c) => ({ ...c })),
    tech: 'tapestry',
    rev: false,
    mfirst: 0,
    cur: 1,
    done: [],
  };
}

export function clampSize(n: number): number {
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(Number(n)) || MIN_SIZE));
}

function cleanPalette(pal: unknown): PaletteColor[] | null {
  if (typeof pal === 'string') {
    const preset = OLD_PRESETS[pal] ?? OLD_PRESETS['y-burg']!;
    return [
      { name: 'Cream', hex: preset[0] },
      { name: 'Dark', hex: preset[1] },
    ];
  }
  if (!Array.isArray(pal)) return null;
  return pal.map((c) => {
    const o = (typeof c === 'object' && c !== null ? c : {}) as Record<string, unknown>;
    return {
      name: typeof o.name === 'string' ? o.name : o.name == null ? '' : String(o.name),
      hex: typeof o.hex === 'string' && HEX.test(o.hex) ? o.hex : '#888888',
    };
  });
}

/** Why these cells can't be a chart for this palette, or null if they're fine. */
function cellsProblem(cells: unknown, colors: number): string | null {
  if (!Array.isArray(cells) || cells.length === 0) return 'it has no chart squares';
  const w = typeof cells[0] === 'string' ? cells[0].length : 0;
  if (w === 0) return 'it has no chart squares';
  if (cells.length > MAX_SIZE || w > MAX_SIZE) return `it's larger than ${MAX_SIZE} × ${MAX_SIZE} squares`;
  for (const row of cells) {
    if (typeof row !== 'string' || row.length !== w) return 'its rows are not all the same length';
    for (const ch of row) {
      if (ch < '0' || ch > '7') return 'it has squares that are not colors';
      if (Number(ch) >= colors) return 'it uses a color that is missing from its palette';
    }
  }
  return null;
}

/**
 * Reads a project as the tracker saved it (also older versions), checking it strictly.
 * Throws ChartFileError with a readable message.
 */
export function chartFromProject(p: unknown, fallbackName = 'Untitled'): ChartContent {
  if (typeof p !== 'object' || p === null || Array.isArray(p)) {
    throw new ChartFileError('This file has no chart in it.');
  }
  const o = p as Record<string, unknown>;
  const pal = cleanPalette(o.pal);
  if (!pal || pal.length < 2 || pal.length > MAX_COLORS) {
    throw new ChartFileError(`This chart can't be opened: it needs between 2 and ${MAX_COLORS} colors.`);
  }
  const problem = cellsProblem(o.cells, pal.length);
  if (problem) throw new ChartFileError(`This chart can't be opened: ${problem}.`);
  const cells = (o.cells as string[]).slice();
  const h = cells.length;
  const w = cells[0]!.length;
  const done = Array.isArray(o.done)
    ? [...new Set(o.done.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= h))].sort((a, b) => a - b)
    : [];
  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 60) : fallbackName.slice(0, 60);
  return {
    name,
    w,
    h,
    cells,
    pal,
    tech: o.tech === 'mosaic' ? 'mosaic' : 'tapestry',
    rev: !!o.rev,
    mfirst: o.mfirst === 1 ? 1 : 0,
    cur: Math.min(Math.max(1, Math.trunc(Number(o.cur)) || 1), h),
    done,
  };
}

/** Like chartFromProject, but returns null instead of throwing (for records read from the database). */
export function tryChartFromProject(p: unknown): ChartContent | null {
  try {
    return chartFromProject(p);
  } catch {
    return null;
  }
}

// ---------- Project files ----------

export const TRACKER_APP = 'tapestry-chart-tracker';
export const TRACKER_VERSION = 2;

export function isProjectFile(data: unknown): boolean {
  return typeof data === 'object' && data !== null && (data as Record<string, unknown>).app === TRACKER_APP;
}

/**
 * Reads the text of a project file (`{app:"tapestry-chart-tracker", version:2, project}`), as the
 * tracker and this app both write them.
 */
export function readProjectFile(text: string, fileName = ''): ChartContent {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ChartFileError("This file isn't a chart project file.");
  }
  if (!isProjectFile(data)) throw new ChartFileError("This file isn't a chart project file.");
  const fallback = fileName.replace(/\.json$/i, '').trim() || 'Opened chart';
  return chartFromProject((data as Record<string, unknown>).project, fallback);
}

/** The project file for a chart. Same format as the tracker's, so it opens in both. */
export function projectFileText(c: ChartContent, updatedAt: number = Date.now()): string {
  const project = {
    name: c.name,
    w: c.w,
    h: c.h,
    cells: c.cells,
    pal: c.pal,
    active: Math.min(1, c.pal.length - 1),
    cur: c.cur,
    done: c.done,
    example: false,
    tech: c.tech,
    rev: c.rev,
    mfirst: c.mfirst,
    updated: updatedAt,
  };
  return JSON.stringify({ app: TRACKER_APP, version: TRACKER_VERSION, project }, null, 1);
}

/** A file name from a chart name, without characters that file systems refuse. */
export function fileBaseName(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60) || 'chart'
  );
}

// ---------- Chart codes ----------

/** The chart as one line of text: `v2|w|h|hexes|names|rows`. */
export function chartCode(c: ChartContent): string {
  return [
    'v2',
    c.w,
    c.h,
    c.pal.map((p) => p.hex.slice(1)).join(','),
    c.pal.map((p) => encodeURIComponent(p.name)).join(','),
    c.cells.join('/'),
  ].join('|');
}

/**
 * Reads a pasted chart code: the `v2|…` code, the very old `WxH:0101/…` code, or the text of a
 * project file. Throws ChartFileError with a readable message.
 */
export function readChartCode(text: string): ChartContent {
  const t = text.trim();
  if (t.startsWith('{')) {
    let data: unknown;
    try {
      data = JSON.parse(t);
    } catch {
      throw new ChartFileError(
        'That looks like a project file, but part of it is missing. Copy all of it, from the first { to the last }, and try again.',
      );
    }
    const o = (data ?? {}) as Record<string, unknown>;
    return chartFromProject(o.project ?? o, 'Pasted chart');
  }

  let w: number, h: number, rows: string[], pal: PaletteColor[];
  const old = /^(\d+)x(\d+):([01/]+)$/.exec(t);
  if (old) {
    w = Number(old[1]);
    h = Number(old[2]);
    rows = old[3]!.split('/');
    pal = [
      { name: 'Cream', hex: '#f3ead8' },
      { name: 'Dark', hex: '#8c1d3c' },
    ];
  } else {
    const p = t.split('|');
    if (p[0] !== 'v2' || p.length !== 6) {
      throw new ChartFileError("That code doesn't look right. Copy the whole code and try again.");
    }
    w = Number(p[1]);
    h = Number(p[2]);
    const hexes = p[3]!.split(',');
    const names = p[4]!.split(',');
    pal = hexes.map((x, i) => {
      let name = names[i] ?? '';
      try {
        name = decodeURIComponent(name);
      } catch {
        // keep it as written
      }
      return { hex: '#' + x, name };
    });
    rows = p[5]!.split('/');
  }
  if (pal.length < 2 || pal.length > MAX_COLORS || pal.some((c) => !HEX.test(c.hex))) {
    throw new ChartFileError("That code doesn't look right. Copy the whole code and try again.");
  }
  if (rows.length !== h || rows.some((r) => r.length !== w) || cellsProblem(rows, pal.length)) {
    throw new ChartFileError('The code is incomplete. Copy the whole thing and try again.');
  }
  return chartFromProject({ name: 'Pasted chart', cells: rows, pal }, 'Pasted chart');
}

// ---------- Small helpers ----------

export function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Perceived lightness, 0 (black) to 255 (white). */
export function lightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Dark or light text that reads well on this color. */
export function inkOn(hex: string): string {
  return lightness(hex) > 150 ? '#2a2228' : '#ffffff';
}

export function colorLabel(c: ChartContent, i: number): string {
  const name = c.pal[i]?.name.trim();
  return `${LETTERS[i]}${name ? ' ' + name : ''}`;
}
