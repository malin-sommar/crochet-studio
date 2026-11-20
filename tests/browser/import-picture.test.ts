import { describe, expect, test } from 'vitest';
import { loadImageFile } from '../../src/charts/importBrowser';
import { chartFromImport, detectGrid, quantize, sampleCells, trimMargins, type Pixels } from '../../src/charts/importImage';
import { TEST_COLORS, drawPicture, randomChart, sameChart, type DrawStyle } from '../support/pictures';

/** Draws a chart and saves it as a real PNG or JPEG file, as a drawing program or screenshot would. */
async function pictureFile(cells: string[], style: DrawStyle, type: 'image/png' | 'image/jpeg', quality?: number) {
  const { data, W, H } = drawPicture(cells, TEST_COLORS, style);
  const canvas = new OffscreenCanvas(W, H);
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data), W, H), 0, 0);
  return canvas.convertToBlob({ type, quality });
}

function importPixels(px: Pixels) {
  const crop = trimMargins(px);
  const { cols, rows } = detectGrid(px, crop);
  return chartFromImport('Test', cols, rows, quantize(sampleCells(px, crop, cols, rows), 'auto'));
}

async function roundTrip(cells: string[], style: DrawStyle, type: 'image/png' | 'image/jpeg', quality?: number) {
  const file = await pictureFile(cells, style, type, quality);
  const { pixels } = await loadImageFile(file);
  return importPixels(pixels);
}

describe('PNG files', () => {
  test('1:1 pixel art', async () => {
    const cells = randomChart(101, 40, 30, 3);
    const c = await roundTrip(cells, { cell: 1 }, 'image/png');
    expect([c.w, c.h]).toEqual([40, 30]);
    expect(sameChart(c.cells, cells)).toBe(true);
  });

  test('scaled pixel art', async () => {
    const cells = randomChart(102, 36, 28, 4);
    const c = await roundTrip(cells, { cell: 9 }, 'image/png');
    expect([c.w, c.h]).toEqual([36, 28]);
    expect(sameChart(c.cells, cells)).toBe(true);
  });

  test('chart screenshot with grid lines', async () => {
    const cells = randomChart(103, 45, 35, 3);
    const c = await roundTrip(cells, { cell: 13, line: 1, margin: 30 }, 'image/png');
    expect([c.w, c.h]).toEqual([45, 35]);
    expect(sameChart(c.cells, cells)).toBe(true);
  });
});

describe('JPEG files (blurry edges and color noise)', () => {
  for (const quality of [0.9, 0.75, 0.6]) {
    test(`chart screenshot with grid lines, quality ${quality}`, async () => {
      const cells = randomChart(110 + quality * 10, 38, 30, 3);
      const c = await roundTrip(cells, { cell: 14, line: 1, margin: 24 }, 'image/jpeg', quality);
      expect([c.w, c.h]).toEqual([38, 30]);
      expect(c.pal).toHaveLength(3);
      expect(sameChart(c.cells, cells)).toBe(true);
    });
  }

  for (const [seed, w, h, colors, cell] of [
    [120, 30, 30, 2, 10],
    [121, 44, 26, 3, 8],
    [122, 24, 36, 4, 12],
  ] as const) {
    test(`scaled pixel art, ${w} × ${h} at ${cell} px, ${colors} colors`, async () => {
      const cells = randomChart(seed, w, h, colors);
      const c = await roundTrip(cells, { cell }, 'image/jpeg', 0.8);
      expect([c.w, c.h]).toEqual([w, h]);
      expect(sameChart(c.cells, cells)).toBe(true);
    });
  }
});

describe('a wider sweep of JPEG files', () => {
  for (let seed = 300; seed < 320; seed++) {
    const grid = seed % 2 === 0;
    const w = 20 + (seed % 7) * 7;
    const h = 18 + (seed % 5) * 9;
    const cell = grid ? 10 + (seed % 4) * 2 : 6 + (seed % 4) * 2;
    const colors = 2 + (seed % 4);
    const quality = [0.92, 0.8, 0.7][seed % 3]!;
    test(`${grid ? 'grid screenshot' : 'pixel art'} ${w} × ${h} at ${cell} px, ${colors} colors, quality ${quality}`, async () => {
      const cells = randomChart(seed, w, h, colors);
      const style = grid ? { cell, line: 1, margin: 16 } : { cell };
      const c = await roundTrip(cells, style, 'image/jpeg', quality);
      expect([c.w, c.h]).toEqual([w, h]);
      expect(sameChart(c.cells, cells)).toBe(true);
    });
  }
});

test('a file that is not a picture is refused', async () => {
  await expect(loadImageFile(new Blob(['hello'], { type: 'text/plain' }))).rejects.toThrow();
});
