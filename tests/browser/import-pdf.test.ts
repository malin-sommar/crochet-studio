import { describe, expect, test } from 'vitest';
import { chartFromImport, quantize, sampleCells } from '../../src/charts/importImage';
import { openPdf, readPdfPage } from '../../src/charts/importPdf';
import { gridFromLabels } from '../../src/charts/pdfLabels';
import { stitchFiddleLikePdf as pdfBytes } from '../support/pdfs';
import { randomChart, sameChart } from '../support/pictures';

async function stitchFiddleLikePdf(cells: string[], cell: number): Promise<Blob> {
  return new Blob([(await pdfBytes(cells, cell)) as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
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
