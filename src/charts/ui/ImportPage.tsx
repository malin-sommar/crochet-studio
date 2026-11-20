import { useLayoutEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react';
import { Card, Page } from '../../components/Page';
import { tabHref } from '../../router';
import { isPdf, loadImageFile } from '../importBrowser';
import {
  chartFromImport,
  detectGrid,
  nameFromFile,
  quantize,
  sampleCells,
  toHex,
  trimMargins,
  type Box,
  type Pixels,
  type Quantized,
} from '../importImage';
import { MAX_COLORS, MAX_SIZE, MIN_SIZE } from '../model';
import { gridFromLabels } from '../pdfLabels';
import { createChart } from '../store';
import type { PdfDocument } from '../importPdf';

interface Picture {
  canvas: HTMLCanvasElement;
  pixels: Pixels;
}

interface Work extends Picture {
  crop: Box;
  cols: number;
  rows: number;
  q: Quantized;
}

type Colors = 'auto' | number;
type Message = { text: string; error?: boolean } | null;

function analyse(pic: Picture, crop: Box, colors: Colors, grid?: { cols: number; rows: number }): Work {
  const g = grid ?? detectGrid(pic.pixels, crop);
  const q = quantize(sampleCells(pic.pixels, crop, g.cols, g.rows), colors);
  return { ...pic, crop, cols: g.cols, rows: g.rows, q };
}

const clampCount = (v: number) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(v) || MIN_SIZE));

export function ImportPage() {
  const [work, setWork] = useState<Work | null>(null);
  const [colors, setColors] = useState<Colors>('auto');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState<{ doc: PdfDocument; page: number } | null>(null);

  async function showPdfPage(doc: PdfDocument, page: number) {
    const { readPdfPage } = await import('../importPdf');
    const { canvas, pixels, numbers } = await readPdfPage(doc, page);
    const fromLabels = gridFromLabels(numbers);
    if (fromLabels) {
      const cols = Math.min(MAX_SIZE, fromLabels.cols);
      const rows = Math.min(MAX_SIZE, fromLabels.rows);
      setWork(analyse({ canvas, pixels }, fromLabels.crop, colors, { cols, rows }));
      setMsg({
        text:
          `Read the grid size from the pattern's row and column numbers: ${fromLabels.cols} × ${fromLabels.rows}.` +
          (fromLabels.cols > MAX_SIZE || fromLabels.rows > MAX_SIZE ? ' Charts larger than 200 stitches are cut to 200.' : ''),
      });
    } else {
      setWork(analyse({ canvas, pixels }, trimMargins(pixels), colors));
      setMsg({
        text: 'No row numbers found on this page, so the grid was found from the picture. Check the squares across and down.',
      });
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setName(nameFromFile(f.name));
    setWork(null);
    setPdf(null);
    setBusy(true);
    try {
      if (isPdf(f)) {
        setMsg({ text: 'Reading the PDF…' });
        try {
          const { openPdf } = await import('../importPdf');
          const doc = await openPdf(f);
          setPdf({ doc, page: 1 });
          await showPdfPage(doc, 1);
        } catch (err) {
          console.error(err);
          setMsg({
            text: `This PDF could not be read (${err instanceof Error ? err.message : String(err)}). Try saving the chart as a picture instead.`,
            error: true,
          });
        }
        return;
      }
      try {
        const pic = await loadImageFile(f);
        setWork(analyse(pic, trimMargins(pic.pixels), colors));
        setMsg(null);
      } catch {
        setMsg({ text: 'That file could not be opened as a picture.', error: true });
      }
    } finally {
      setBusy(false);
    }
  }

  async function onPage(page: number) {
    if (!pdf) return;
    setPdf({ ...pdf, page });
    setMsg({ text: 'Reading the page…' });
    try {
      await showPdfPage(pdf.doc, page);
    } catch {
      setMsg({ text: 'That page could not be read.', error: true });
    }
  }

  async function onCreate() {
    if (!work) return;
    const chart = await createChart(chartFromImport(name, work.cols, work.rows, work.q));
    window.location.hash = tabHref('charts', chart.id);
  }

  return (
    <Page title="Import a picture or PDF" back={{ href: tabHref('charts'), label: 'Charts' }}>
      <Card title="Choose a file" id="file">
        <p className="hint">
          A pixel-art picture, a screenshot of a chart, or a chart PDF (for example a pattern made in Stitch Fiddle).
          The app finds the grid, then groups the squares into the number of colors you choose. Files are read on
          this device and never uploaded.
        </p>
        <label className="btn primary file-btn">
          Choose picture or PDF
          <input
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="visually-hidden"
            data-testid="import-picture"
            onChange={(e) => void onFile(e)}
          />
        </label>
        {busy && !msg && <p role="status">Opening…</p>}
        {msg && (
          <p className={`note ${msg.error ? 'error' : ''}`} role={msg.error ? 'alert' : 'status'}>
            {msg.text}
          </p>
        )}
        {pdf && pdf.doc.numPages > 1 && (
          <label className="field">
            <span>Page</span>
            <select value={pdf.page} onChange={(e) => void onPage(Number(e.target.value))}>
              {Array.from({ length: pdf.doc.numPages }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1} of {pdf.doc.numPages}
                </option>
              ))}
            </select>
          </label>
        )}
      </Card>

      {work && (
        <>
          <Card title="Find the chart" id="find">
            <SourceView
              work={work}
              onCrop={(crop) => setWork(analyse(work, crop.w < 6 || crop.h < 6 ? trimMargins(work.pixels) : crop, colors))}
            />
            <div className="fields">
              <CountField
                label="Squares across"
                value={work.cols}
                onChange={(cols) => setWork(analyse(work, work.crop, colors, { cols, rows: work.rows }))}
              />
              <CountField
                label="Squares down"
                value={work.rows}
                onChange={(rows) => setWork(analyse(work, work.crop, colors, { cols: work.cols, rows }))}
              />
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setWork(analyse(work, work.crop, colors))}>
                Detect again
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setWork(analyse(work, { x: 0, y: 0, w: work.pixels.W, h: work.pixels.H }, colors))}
              >
                Use whole picture
              </button>
            </div>
            <p className="hint">
              If the blue grid lines don't sit on the squares, correct the number of squares across and down. Your
              drawing program usually shows the canvas size.
            </p>
          </Card>

          <Card title="Result" id="result">
            <label className="field">
              <span>Colors</span>
              <select
                value={String(colors)}
                onChange={(e) => {
                  const c: Colors = e.target.value === 'auto' ? 'auto' : Number(e.target.value);
                  setColors(c);
                  setWork(analyse(work, work.crop, c, { cols: work.cols, rows: work.rows }));
                }}
              >
                <option value="auto">Automatic</option>
                {Array.from({ length: MAX_COLORS - 1 }, (_, i) => i + 2).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <ResultView work={work} />
            <p className="muted" data-testid="import-result">
              {work.cols} × {work.rows} stitches, {work.q.centers.length} colors
              {colors === 'auto' ? ' (found automatically)' : ''}
            </p>
            <label className="field">
              <span>Name</span>
              <input type="text" value={name} maxLength={60} placeholder="Imported chart" onChange={(e) => setName(e.target.value)} />
            </label>
            <p className="hint">
              This makes a new chart, so your other charts stay as they are. You can rename and recolor the colors
              afterwards.
            </p>
            <div className="actions">
              <button type="button" className="btn primary" onClick={() => void onCreate()}>
                Create chart
              </button>
              <a className="btn" href={tabHref('charts')}>
                Cancel
              </a>
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}

function CountField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(String(value));
  }
  const commit = () => {
    const v = clampCount(Number(text));
    setText(String(v));
    if (v !== value) onChange(v);
  };
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={MIN_SIZE}
        max={MAX_SIZE}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
    </label>
  );
}

/** The picture, with the chart area outlined and the grid drawn over it. Drag to select the chart. */
function SourceView({ work, onCrop }: { work: Work; onCrop: (b: Box) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [crop, setCrop] = useState(work.crop);
  const [shownCrop, setShownCrop] = useState(work.crop);
  if (shownCrop !== work.crop) {
    setShownCrop(work.crop);
    setCrop(work.crop);
  }

  useLayoutEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const { W, H } = work.pixels;
    cv.width = W;
    cv.height = H;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(work.canvas, 0, 0);
    const c = crop;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, 0, W, c.y);
    ctx.fillRect(0, c.y + c.h, W, H - c.y - c.h);
    ctx.fillRect(0, c.y, c.x, c.h);
    ctx.fillRect(c.x + c.w, c.y, W - c.x - c.w, c.h);
    const lw = Math.max(1, W / 400);
    ctx.lineWidth = lw;
    ctx.strokeStyle = 'rgba(27,143,214,.9)';
    ctx.beginPath();
    const cw = c.w / work.cols;
    const ch = c.h / work.rows;
    if (crop === work.crop && (cw * 400) / W >= 1.5) {
      for (let i = 0; i <= work.cols; i++) {
        ctx.moveTo(c.x + i * cw, c.y);
        ctx.lineTo(c.x + i * cw, c.y + c.h);
      }
      for (let i = 0; i <= work.rows; i++) {
        ctx.moveTo(c.x, c.y + i * ch);
        ctx.lineTo(c.x + c.w, c.y + i * ch);
      }
    }
    ctx.stroke();
    ctx.lineWidth = lw * 2.5;
    ctx.strokeStyle = '#e0457b';
    ctx.strokeRect(c.x, c.y, c.w, c.h);
  }, [work, crop]);

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const { W, H } = work.pixels;
    return {
      x: Math.max(0, Math.min(W, ((e.clientX - r.left) / r.width) * W)),
      y: Math.max(0, Math.min(H, ((e.clientY - r.top) / r.height) * H)),
    };
  };

  return (
    <figure className="import-figure">
      <canvas
        ref={ref}
        className="import-source"
        role="img"
        aria-label="Your picture, with the chart area outlined"
        onPointerDown={(e) => {
          drag.current = point(e);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start) return;
          const p = point(e);
          setCrop({
            x: Math.round(Math.min(p.x, start.x)),
            y: Math.round(Math.min(p.y, start.y)),
            w: Math.max(1, Math.round(Math.abs(p.x - start.x))),
            h: Math.max(1, Math.round(Math.abs(p.y - start.y))),
          });
        }}
        onPointerUp={() => {
          if (!drag.current) return;
          drag.current = null;
          onCrop(crop);
        }}
      />
      <figcaption className="muted">
        Your picture. If there's anything around the chart, drag across the chart to select just that part.
      </figcaption>
    </figure>
  );
}

function ResultView({ work }: { work: Work }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const k = Math.max(2, Math.floor(600 / Math.max(work.cols, work.rows)));
    const hexes = work.q.centers.map(toHex);
    cv.width = work.cols * k;
    cv.height = work.rows * k;
    for (let r = 0; r < work.rows; r++) {
      for (let q = 0; q < work.cols; q++) {
        ctx.fillStyle = hexes[work.q.assign[r * work.cols + q]!]!;
        ctx.fillRect(q * k, r * k, k, k);
      }
    }
    if (k >= 5) {
      ctx.strokeStyle = 'rgba(0,0,0,.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= work.cols; i++) {
        ctx.moveTo(i * k + 0.5, 0);
        ctx.lineTo(i * k + 0.5, cv.height);
      }
      for (let i = 0; i <= work.rows; i++) {
        ctx.moveTo(0, i * k + 0.5);
        ctx.lineTo(cv.width, i * k + 0.5);
      }
      ctx.stroke();
    }
  }, [work]);
  return <canvas ref={ref} className="import-result" role="img" aria-label="The chart it makes" />;
}
