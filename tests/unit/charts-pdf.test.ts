import { PDFDocument } from 'pdf-lib';
import { describe, expect, test } from 'vitest';
import { EXAMPLE_HEART, blankChart } from '../../src/charts/model';
import { buildChartPdf, pdfSafe } from '../../src/charts/pdfExport';
import { gridFromLabels, isLabelText, labelAxis, splitLabels, type PageNumber } from '../../src/charts/pdfLabels';
import { rng } from '../support/pictures';

describe('PDF export', () => {
  test('makes a chart page and a written-rows page', async () => {
    const bytes = await buildChartPdf({ ...EXAMPLE_HEART, name: 'Hjärta – för mamma', done: [1, 2] });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getTitle()).toBe('Hjärta - för mamma');
  });

  test('a tall mosaic chart spills its rows onto more pages', async () => {
    const tall = { ...blankChart(60, 200), tech: 'mosaic' as const, rev: true };
    const doc = await PDFDocument.load(await buildChartPdf(tall));
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);
  });

  test('replaces letters the PDF font does not have', () => {
    expect(pdfSafe('Row 1 → left · “ok” 🧶')).toBe('Row 1 -> left · "ok" ??');
  });
});

/** Row and column numbers placed like Stitch Fiddle does: columns along the bottom, odd rows right, even rows left. */
function stitchFiddleNumbers(cols: number, rows: number, cell: number, x0: number, y0: number, jitter = 0): PageNumber[] {
  const random = rng(cols * 1000 + rows);
  const j = () => (random() - 0.5) * jitter;
  const out: PageNumber[] = [];
  for (let n = 1; n <= cols; n++) out.push({ n, x: x0 + (n - 0.5) * cell + j(), y: y0 + rows * cell + cell * 0.8 + j() });
  for (let n = 1; n <= rows; n++) {
    const y = y0 + (rows - n + 0.5) * cell + j();
    out.push({ n, x: n % 2 === 1 ? x0 + cols * cell + cell * 0.9 : x0 - cell * 0.9, y });
  }
  return out;
}

describe('reading a chart from the numbers printed around it', () => {
  test('finds size and position with row numbers split between both sides', () => {
    const nums = stitchFiddleNumbers(30, 25, 12, 100, 80);
    const g = gridFromLabels(nums);
    expect(g).not.toBeNull();
    expect([g!.cols, g!.rows]).toEqual([30, 25]);
    expect(g!.crop.x).toBeCloseTo(100, 0);
    expect(g!.crop.y).toBeCloseTo(80, 0);
    expect(g!.crop.w).toBeCloseTo(360, 0);
    expect(g!.crop.h).toBeCloseTo(300, 0);
  });

  test('copes with numbers that are slightly off their line', () => {
    const g = gridFromLabels(stitchFiddleNumbers(48, 60, 9, 50, 40, 1.5));
    expect([g!.cols, g!.rows]).toEqual([48, 60]);
  });

  test('ignores page numbers and other stray numbers', () => {
    const nums = [...stitchFiddleNumbers(20, 20, 10, 60, 60), { n: 1, x: 300, y: 820 }, { n: 2026, x: 40, y: 20 }];
    const g = gridFromLabels(nums);
    expect([g!.cols, g!.rows]).toEqual([20, 20]);
  });

  test('gives up when there are too few numbers', () => {
    expect(labelAxis([{ n: 1, x: 0, y: 0 }], 'y', 'x')).toBeNull();
    expect(gridFromLabels(stitchFiddleNumbers(4, 4, 10, 0, 0))).toBeNull();
  });

  test('splits numbers the PDF reader joined into one piece of text', () => {
    // As pdf.js gives them: "9 10 11 … 20" starting at x = 183, 116 wide; real centres are 185, 195, … 295
    const text = Array.from({ length: 12 }, (_, i) => 9 + i).join(' ');
    const parts = splitLabels(text, 183, 116)!;
    expect(parts.map((p) => p.n)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    parts.forEach((p, i) => expect(Math.abs(p.x - (185 + i * 10))).toBeLessThan(2.5));
    expect(splitLabels('7', 10, 4)).toEqual([{ n: 7, x: 12 }]);
    expect(splitLabels('Row 7', 0, 20)).toBeNull();
    expect(splitLabels(' ', 0, 3)).toBeNull();
  });

  test('only short whole numbers count as labels', () => {
    expect(['5', ' 120 ', '1000', '1a', '', '3.5'].map(isLabelText)).toEqual([true, true, false, false, false, false]);
  });
});
