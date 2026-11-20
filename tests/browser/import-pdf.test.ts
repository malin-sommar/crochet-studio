import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { describe, expect, test } from 'vitest';
import { chartFromImport, quantize, sampleCells } from '../../src/charts/importImage';
import { openPdf, readPdfPage } from '../../src/charts/importPdf';
import { gridFromLabels } from '../../src/charts/pdfLabels';
import { TEST_COLORS, randomChart, sameChart } from '../support/pictures';

/**
 * A PDF laid out like a Stitch Fiddle pattern: a title, the chart with grid lines, column numbers
 * along the bottom, and row numbers split between the sides (odd on the right, even on the left).
 * Made from scratch here, since real patterns can't go into a public repository.
 */
async function stitchFiddleLikePdf(cells: string[], cell: number): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595.28, 841.89]);
  const w = cells[0]!.length;
  const h = cells.length;
  const x0 = (595.28 - w * cell) / 2;
  const top = 760;
  page.drawText('My pattern, page 1', { x: 40, y: 800, size: 14, font });
  const hex = (s: string) => rgb(...([1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255) as [number, number, number]));
  for (let r = 0; r < h; r++) {
    for (let x = 0; x < w; x++) {
      page.drawRectangle({
        x: x0 + x * cell,
        y: top - (r + 1) * cell,
        width: cell,
        height: cell,
        color: hex(TEST_COLORS[Number(cells[r]![x])]!),
        borderColor: rgb(0.55, 0.55, 0.55),
        borderWidth: 0.3,
      });
    }
  }
  const size = Math.min(7, cell * 0.7);
  for (let n = 1; n <= w; n++) {
    const t = String(n);
    page.drawText(t, { x: x0 + (n - 0.5) * cell - font.widthOfTextAtSize(t, size) / 2, y: top - h * cell - cell - size * 0.35, size, font });
  }
  for (let n = 1; n <= h; n++) {
    const t = String(n);
    const yMid = top - (h - n + 0.5) * cell;
    const x = n % 2 === 1 ? x0 + w * cell + 3 : x0 - 3 - font.widthOfTextAtSize(t, size);
    page.drawText(t, { x, y: yMid - size * 0.35, size, font });
  }
  page.drawText('1', { x: 297, y: 20, size: 9, font }); // a page number, to be ignored
  return new Blob([(await doc.save()) as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

describe('Stitch Fiddle-style PDF', () => {
  for (const [seed, w, h, colors, cell] of [
    [201, 30, 40, 2, 10],
    [202, 50, 60, 3, 8],
    [203, 24, 24, 4, 14],
  ] as const) {
    test(`${w} × ${h}, ${colors} colors: size read from the numbers, squares from the picture`, async () => {
      const cells = randomChart(seed, w, h, colors);
      const doc = await openPdf(await stitchFiddleLikePdf(cells, cell));
      const { pixels, numbers } = await readPdfPage(doc, 1);
      const grid = gridFromLabels(numbers);
      expect(grid).not.toBeNull();
      expect([grid!.cols, grid!.rows]).toEqual([w, h]);
      const q = quantize(sampleCells(pixels, grid!.crop, grid!.cols, grid!.rows), 'auto');
      const chart = chartFromImport('PDF', grid!.cols, grid!.rows, q);
      expect(chart.pal).toHaveLength(colors);
      expect(sameChart(chart.cells, cells)).toBe(true);
    });
  }
});

// Real PDFs you put in tests/fixtures/private/ (never uploaded to GitHub) are checked too:
// the app must find their row and column numbers.
const privatePdfs = import.meta.glob('../fixtures/private/*.pdf', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

describe('your own PDFs (tests/fixtures/private)', () => {
  const entries = Object.entries(privatePdfs);
  if (!entries.length) test.skip('no private PDFs on this computer', () => {});
  for (const [path, url] of entries) {
    test(path.split('/').pop()!, async () => {
      const doc = await openPdf(await (await fetch(url)).blob());
      const { numbers } = await readPdfPage(doc, 1);
      const grid = gridFromLabels(numbers);
      expect(grid, 'row and column numbers found').not.toBeNull();
      console.log(`${path}: ${grid!.cols} × ${grid!.rows}`);
    });
  }
});
