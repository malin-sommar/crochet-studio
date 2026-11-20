import { LETTERS, colorLabel, hexToRgb, type ChartContent } from './model';
import { mosaicRuns } from './mosaic';
import { colorCounts } from './edit';
import { isRightToLeft, tapestryRuns } from './rows';

/**
 * The chart as a PDF: the chart with a legend on page 1, then every row written out.
 * Ported from the Tapestry Chart Tracker. pdf-lib is loaded only when a PDF is made.
 */

/** The PDF's built-in font only has Western European letters; replace anything else. */
export function pdfSafe(t: string): string {
  return String(t)
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7e\xa0-\xff]/g, '?');
}

function rowParts(c: ChartContent, n: number): string[] {
  return c.tech === 'mosaic'
    ? mosaicRuns(c, n).map(([t, k]) => `${k} ${t}`)
    : tapestryRuns(c, n).map(([ci, k]) => `${k} ${LETTERS[ci]}`);
}

export async function buildChartPdf(c: ChartContent): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const mosaic = c.tech === 'mosaic';
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(c.name || 'Chart'));
  doc.setCreator('Crochet Studio');
  const F = await doc.embedFont(StandardFonts.Helvetica);
  const FB = await doc.embedFont(StandardFonts.HelveticaBold);
  const PW = 595.28;
  const PH = 841.89;
  const M = 40;
  const col = (hex: string) => {
    const [r, g, b] = hexToRgb(hex);
    return rgb(r / 255, g / 255, b / 255);
  };
  const grey = rgb(0.42, 0.38, 0.44);
  const ink = rgb(0.13, 0.1, 0.14);

  let page = doc.addPage([PW, PH]);
  let y = PH - M;
  const text = (t: string, x: number, yy: number, size: number, font = F, color = ink) =>
    page.drawText(pdfSafe(t), { x, y: yy, size, font, color });

  text(c.name || 'Chart', M, y - 18, 20, FB);
  y -= 30;
  const technique = mosaic ? (c.rev ? 'reversible overlay mosaic' : 'overlay mosaic') : 'tapestry crochet in sc';
  text(`${c.w} x ${c.h} stitches  ·  ${c.pal.length} colors  ·  ${technique}`, M, y - 10, 10, F, grey);
  y -= 26;

  // Legend
  const counts = colorCounts(c);
  let lx = M;
  for (let i = 0; i < c.pal.length; i++) {
    const label = `${colorLabel(c, i)}  ${counts[i]} sts`;
    const width = F.widthOfTextAtSize(pdfSafe(label), 9) + 26;
    if (lx + width > PW - M) {
      lx = M;
      y -= 16;
    }
    page.drawRectangle({
      x: lx,
      y: y - 10,
      width: 12,
      height: 12,
      color: col(c.pal[i]!.hex),
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.5,
    });
    text(label, lx + 16, y - 8, 9);
    lx += width + 8;
  }
  y -= 24;

  // The chart
  const numW = c.h >= 100 ? 14 : 11;
  const availW = PW - 2 * M - numW;
  const availH = y - M - 14;
  const cs = Math.min(availW / c.w, availH / c.h, 14);
  const cw = c.w * cs;
  const ch = c.h * cs;
  const x0 = M;
  const y0 = y - ch;
  for (let r = 0; r < c.h; r++) {
    const row = c.cells[r]!;
    let st = 0;
    for (let x = 1; x <= c.w; x++) {
      if (x === c.w || row[x] !== row[st]) {
        page.drawRectangle({
          x: x0 + st * cs,
          y: y0 + (c.h - 1 - r) * cs,
          width: (x - st) * cs + 0.02,
          height: cs + 0.02,
          color: col(c.pal[Number(row[st])]!.hex),
        });
        st = x;
      }
    }
  }
  if (cs >= 3) {
    const thin = rgb(0.55, 0.55, 0.55);
    for (let i = 0; i <= c.w; i++) {
      const thick = i % 10 === 0 || i === c.w;
      page.drawLine({
        start: { x: x0 + i * cs, y: y0 },
        end: { x: x0 + i * cs, y: y0 + ch },
        thickness: thick ? 0.6 : 0.15,
        color: thick ? ink : thin,
      });
    }
    for (let i = 0; i <= c.h; i++) {
      const thick = i % 10 === 0 || i === c.h;
      page.drawLine({
        start: { x: x0, y: y0 + i * cs },
        end: { x: x0 + cw, y: y0 + i * cs },
        thickness: thick ? 0.6 : 0.15,
        color: thick ? ink : thin,
      });
    }
  } else {
    page.drawRectangle({ x: x0, y: y0, width: cw, height: ch, borderColor: ink, borderWidth: 0.6 });
  }
  const fs = Math.max(4, Math.min(7, cs * 0.9));
  for (let n = 1; n <= c.h; n++) {
    if (n === 1 || n % (cs >= 6 ? 2 : 5) === 0) text(String(n), x0 + cw + 3, y0 + (n - 1) * cs + cs / 2 - fs * 0.35, fs, F, grey);
  }
  text(
    mosaic
      ? 'Overlay mosaic. Row 1 is the bottom row. Every row: front facing you, right to left, cut yarn at the end. ' +
          'sc = back loop sc; X = dc in front loop 2 rows below' +
          (c.rev ? '; A = anchored dc.' : '.')
      : 'Row 1 is the bottom row. Odd rows are worked right to left, even rows left to right.',
    M,
    y0 - 12,
    8,
    F,
    grey,
  );

  // Written rows, two columns per page
  page = doc.addPage([PW, PH]);
  y = PH - M;
  text('Row by row', M, y - 14, 14, FB);
  y -= 30;
  const fsz = 8.5;
  const lh = 11.5;
  const colW = (PW - 2 * M - 16) / 2;
  let colx = M;
  const done = new Set(c.done);
  const newColumn = () => {
    if (colx === M) {
      colx = M + colW + 16;
      y = PH - M - 30;
    } else {
      page = doc.addPage([PW, PH]);
      colx = M;
      y = PH - M;
    }
  };
  for (let n = 1; n <= c.h; n++) {
    const where = mosaic ? colorLabel(c, n % 2 === 1 ? c.mfirst : 1 - c.mfirst) : isRightToLeft(n) ? 'R to L' : 'L to R';
    const head = `Row ${n} (${where})${done.has(n) ? ' - done' : ''}: `;
    const parts = rowParts(c, n);
    const lines: string[] = [];
    let line = head;
    parts.forEach((part, i) => {
      const piece = part + (i < parts.length - 1 ? ', ' : '');
      if (F.widthOfTextAtSize(pdfSafe(line + piece), fsz) > colW && line.trim()) {
        lines.push(line);
        line = '    ';
      }
      line += piece;
    });
    lines.push(line);
    if (y - lines.length * lh < M) newColumn();
    const color = done.has(n) ? grey : ink;
    lines.forEach((ln, i) => {
      if (i === 0) {
        const hw = FB.widthOfTextAtSize(pdfSafe(head), fsz);
        page.drawText(pdfSafe(head), { x: colx, y: y - fsz, size: fsz, font: FB, color });
        page.drawText(pdfSafe(ln.slice(head.length)), { x: colx + hw, y: y - fsz, size: fsz, font: F, color });
      } else {
        page.drawText(pdfSafe(ln), { x: colx, y: y - fsz, size: fsz, font: F, color });
      }
      y -= lh;
    });
    y -= 2;
  }
  const pages = doc.getPages();
  pages.forEach((pg, i) =>
    pg.drawText(pdfSafe(`${c.name || 'Chart'}  ·  page ${i + 1} of ${pages.length}`), {
      x: M,
      y: 22,
      size: 7,
      font: F,
      color: grey,
    }),
  );
  return doc.save();
}
