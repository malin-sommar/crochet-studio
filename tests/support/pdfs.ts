import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { TEST_COLORS } from './pictures';

/**
 * A PDF laid out like a Stitch Fiddle pattern: a title, the chart with grid lines, column numbers
 * along the bottom, and row numbers split between the sides (odd on the right, even on the left).
 * Made from scratch, since real patterns can't go into a public repository.
 */
export async function stitchFiddleLikePdf(cells: string[], cell: number): Promise<Uint8Array> {
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
    page.drawText(t, {
      x: x0 + (n - 0.5) * cell - font.widthOfTextAtSize(t, size) / 2,
      y: top - h * cell - cell - size * 0.35,
      size,
      font,
    });
  }
  for (let n = 1; n <= h; n++) {
    const t = String(n);
    const yMid = top - (h - n + 0.5) * cell;
    const x = n % 2 === 1 ? x0 + w * cell + 3 : x0 - 3 - font.widthOfTextAtSize(t, size);
    page.drawText(t, { x, y: yMid - size * 0.35, size, font });
  }
  page.drawText('1', { x: 297, y: 20, size: 9, font }); // a page number, to be ignored
  return doc.save();
}
