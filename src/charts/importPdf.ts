import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MAX_IMAGE_SIDE, type Pixels } from './importImage';
import { canvasPixels } from './importBrowser';
import { isLabelText, splitLabels, type PageNumber } from './pdfLabels';

/**
 * Reading chart PDFs with pdf.js. This module is only loaded when a PDF is imported. The PDF is
 * read in the browser and never uploaded.
 */

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfDocument = pdfjs.PDFDocumentProxy;

export async function openPdf(file: Blob): Promise<PdfDocument> {
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

/** Draws one page (1 = first) at up to 3200 pixels, and finds the numbers printed on it. */
export async function readPdfPage(
  doc: PdfDocument,
  pageNumber: number,
): Promise<{ canvas: HTMLCanvasElement; pixels: Pixels; numbers: PageNumber[] }> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(8, MAX_IMAGE_SIDE / Math.max(base.width, base.height));
  const vp = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;

  const text = await page.getTextContent();
  const numbers: PageNumber[] = [];
  for (const item of text.items) {
    if (!('str' in item)) continue;
    const t = item.transform as number[];
    // Only horizontal text: rotated labels can't be split by width
    if (Math.abs(t[1]!) > 1e-6 || Math.abs(t[2]!) > 1e-6) {
      if (!isLabelText(item.str)) continue;
    }
    const labels = splitLabels(item.str, t[4]!, item.width);
    if (!labels) continue;
    const fontHeight = Math.hypot(t[2]!, t[3]!);
    for (const l of labels) {
      const [x, y] = vp.convertToViewportPoint(l.x, t[5]! + fontHeight * 0.35) as [number, number];
      numbers.push({ n: l.n, x, y });
    }
  }
  page.cleanup();
  return { canvas, pixels: canvasPixels(canvas), numbers };
}
