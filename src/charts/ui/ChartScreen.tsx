import { useState } from 'react';
import { Page } from '../../components/Page';
import { tabHref } from '../../router';
import { MAX_ZOOM, fitZoom, readChartView, writeChartView, type ChartView } from '../view';
import { ChartEditor } from './ChartEditor';
import { CrochetView } from './CrochetView';
import { useChartSession, type ChartSession } from './useChartSession';

export type ReadySession = Extract<ChartSession, { status: 'ready' }>;
export type SetView = (patch: Partial<ChartView>) => void;

/** Roughly how much width a chart card has on this screen. */
function availableWidth(): number {
  const w = window.innerWidth;
  return w >= 768 ? Math.min(760, w - 320) - 42 : w - 74;
}

/** One chart, in edit or crochet mode. Both modes share the open chart and its undo history. */
export function ChartScreen({ id, mode }: { id: string; mode: 'edit' | 'crochet' }) {
  const session = useChartSession(id);
  const [saved, setSaved] = useState<ChartView | null>(() => readChartView(id));

  if (session.status === 'loading') {
    return (
      <p className="muted" role="status">
        Opening the chart…
      </p>
    );
  }
  if (session.status === 'missing') {
    return (
      <Page title="Chart not found" lead="It may have been moved to the Trash. You can restore it from Settings.">
        <p>
          <a className="btn" href={tabHref('charts')}>
            Back to Charts
          </a>
        </p>
      </Page>
    );
  }

  const chart = session.chart;
  const view: ChartView = saved ?? {
    zoom: Math.min(MAX_ZOOM, fitZoom(chart.w, availableWidth())),
    tool: 'paint',
    active: Math.min(1, chart.pal.length - 1),
  };
  const maxActive = chart.tech === 'mosaic' ? 1 : chart.pal.length - 1;
  const shown = { ...view, active: Math.min(view.active, maxActive) };
  const setView: SetView = (patch) => {
    const next = { ...shown, ...patch };
    setSaved(next);
    writeChartView(id, next);
  };

  return mode === 'crochet' ? (
    <CrochetView s={session} view={shown} setView={setView} />
  ) : (
    <ChartEditor s={session} view={shown} setView={setView} />
  );
}

export function ModeSwitch({ id, mode }: { id: string; mode: 'edit' | 'crochet' }) {
  return (
    <nav className="mode-switch" aria-label="Mode">
      <a href={tabHref('charts', id)} aria-current={mode === 'edit' ? 'page' : undefined}>
        Edit
      </a>
      <a href={tabHref('charts', id, 'crochet')} aria-current={mode === 'crochet' ? 'page' : undefined}>
        Crochet
      </a>
    </nav>
  );
}
