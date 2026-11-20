import { describe, expect, test } from 'vitest';
import {
  autoColorCount,
  chartFromImport,
  detectGrid,
  kmeans,
  nameFromFile,
  pixelsFromRGBA,
  profilePeriod,
  quantize,
  sampleCells,
  toHex,
  trimMargins,
  type Pixels,
} from '../../src/charts/importImage';
import { TEST_COLORS, drawPicture, randomChart, sameChart } from '../support/pictures';

function importPicture(px: Pixels, colors: number | 'auto' = 'auto') {
  const crop = trimMargins(px);
  const { cols, rows } = detectGrid(px, crop);
  const q = quantize(sampleCells(px, crop, cols, rows), colors);
  return { crop, cols, rows, chart: chartFromImport('Test', cols, rows, q) };
}

function picture(cells: string[], style: Parameters<typeof drawPicture>[2]): Pixels {
  const { data, W, H } = drawPicture(cells, TEST_COLORS, style);
  return pixelsFromRGBA(data, W, H);
}

describe('importing pixel art', () => {
  for (const [seed, w, h, colors] of [
    [1, 20, 16, 2],
    [2, 31, 24, 3],
    [3, 45, 40, 4],
    [4, 60, 25, 5],
  ] as const) {
    test(`1:1 pixel art, ${w} × ${h}, ${colors} colors`, () => {
      const cells = randomChart(seed, w, h, colors);
      const r = importPicture(picture(cells, { cell: 1 }));
      expect([r.cols, r.rows]).toEqual([w, h]);
      expect(r.chart.pal).toHaveLength(colors);
      expect(sameChart(r.chart.cells, cells)).toBe(true);
    });

    test(`pixel art scaled up 7 times, ${w} × ${h}, ${colors} colors`, () => {
      const cells = randomChart(seed + 10, w, h, colors);
      const r = importPicture(picture(cells, { cell: 7 }));
      expect([r.cols, r.rows]).toEqual([w, h]);
      expect(sameChart(r.chart.cells, cells)).toBe(true);
    });
  }
});

describe('importing larger scaled pixel art (more than 200 px, found by repeat length)', () => {
  for (let seed = 20; seed < 32; seed++) {
    const w = 25 + (seed % 7) * 6;
    const h = 20 + (seed % 5) * 7;
    const scale = 6 + (seed % 4) * 2;
    test(`${w} × ${h} squares at ${scale} px`, () => {
      const cells = randomChart(seed, w, h, 2 + (seed % 4));
      const r = importPicture(picture(cells, { cell: scale }));
      expect([r.cols, r.rows]).toEqual([w, h]);
      expect(sameChart(r.chart.cells, cells)).toBe(true);
    });
  }
});

describe('importing chart screenshots with grid lines', () => {
  for (const [seed, w, h, colors, cell] of [
    [5, 30, 30, 2, 14],
    [6, 40, 28, 3, 12],
    [7, 25, 50, 4, 16],
  ] as const) {
    test(`${w} × ${h}, ${colors} colors, ${cell} px squares, with a white margin`, () => {
      const cells = randomChart(seed, w, h, colors);
      const r = importPicture(picture(cells, { cell, line: 1, margin: 24 }));
      expect([r.cols, r.rows]).toEqual([w, h]);
      expect(sameChart(r.chart.cells, cells)).toBe(true);
    });
  }
});

describe('more grid-line screenshots', () => {
  for (let seed = 40; seed < 52; seed++) {
    const w = 15 + (seed % 6) * 9;
    const h = 12 + (seed % 5) * 8;
    const cell = 9 + (seed % 4) * 3;
    test(`${w} × ${h} squares at ${cell} px`, () => {
      const cells = randomChart(seed, w, h, 2 + (seed % 3));
      const r = importPicture(picture(cells, { cell, line: 1, margin: 10 + (seed % 3) * 15 }));
      expect([r.cols, r.rows]).toEqual([w, h]);
      expect(sameChart(r.chart.cells, cells)).toBe(true);
    });
  }

  test('with a darker line every 10 squares', () => {
    const cells = randomChart(60, 42, 33, 3);
    const { data, W, H } = drawPicture(cells, TEST_COLORS, { cell: 12, line: 1, margin: 20 });
    // darken every 10th grid line
    for (let y = 20; y < H - 20; y++) {
      for (let x = 20; x < W - 20; x++) {
        const gx = x - 20;
        const gy = y - 20;
        if ((gx % 120 === 0 && gx % 12 === 0) || (gy % 120 === 0 && gy % 12 === 0)) {
          const o = (y * W + x) * 4;
          data[o] = data[o + 1] = data[o + 2] = 30;
        }
      }
    }
    const r = importPicture(pixelsFromRGBA(data, W, H));
    expect([r.cols, r.rows]).toEqual([42, 33]);
    expect(sameChart(r.chart.cells, cells)).toBe(true);
  });
});

describe('the pieces', () => {
  test('finds a margin, but not when the background is the margin color', () => {
    const cells = randomChart(8, 20, 20, 3);
    expect(trimMargins(picture(cells, { cell: 5, margin: 30 }))).toEqual({ x: 30, y: 30, w: 100, h: 100 });
    const bgMargin = picture(cells, { cell: 5, margin: 30, marginColor: TEST_COLORS[0] });
    expect(trimMargins(bgMargin)).toEqual({ x: 0, y: 0, w: bgMargin.W, h: bgMargin.H });
  });

  test('finds the repeat length of a pattern', () => {
    const prof = Array.from({ length: 200 }, (_, i) => (i % 10 === 0 ? 1 : 0));
    expect(profilePeriod(prof)?.period).toBeCloseTo(10, 1);
    expect(profilePeriod(new Array(50).fill(3))).toBeNull();
  });

  test('groups colors the same way every time, lightest first', () => {
    const vals = new Float32Array([250, 250, 250, 10, 10, 10, 245, 248, 250, 20, 15, 12]);
    const a = kmeans(vals, 2);
    expect(a.assign).toEqual([0, 1, 0, 1]);
    expect(kmeans(vals, 2)).toEqual(a);
    expect(autoColorCount(vals)).toBe(2);
  });

  test('a chosen number of colors is used', () => {
    const cells = randomChart(9, 20, 20, 4);
    expect(importPicture(picture(cells, { cell: 3 }), 2).chart.pal).toHaveLength(2);
  });

  test('two colors are named Light and Dark', () => {
    const q = kmeans(new Float32Array([255, 255, 255, 0, 0, 0]), 2);
    expect(chartFromImport('x', 2, 1, q).pal.map((p) => p.name)).toEqual(['Light', 'Dark']);
    expect(toHex([255, 128.4, -3])).toBe('#ff8000');
  });

  test('names come from the file name', () => {
    expect(nameFromFile('heart_chart-v2.png')).toBe('heart chart v2');
  });

  test('transparent pixels count as white', () => {
    const px = pixelsFromRGBA(new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255]), 2, 1);
    expect([...px.RGB]).toEqual([255, 255, 255, 0, 0, 0]);
  });
});
