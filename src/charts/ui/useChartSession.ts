import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { ChartContent } from '../model';
import { loadChart, saveChart, type ChartRecord } from '../store';

const SAVE_DELAY_MS = 400;
const UNDO_LIMIT = 60;

export type ChartSession =
  | { status: 'loading' }
  | { status: 'missing' }
  | {
      status: 'ready';
      chart: ChartRecord;
      /** Applies a change and saves it shortly after. `undoable` changes can be undone. */
      update: (fn: (c: ChartContent) => ChartContent, opts?: { undoable?: boolean }) => void;
      undo: () => void;
      canUndo: boolean;
      /** Saves now (before leaving, deleting, downloading...). */
      flush: () => Promise<void>;
    };

/**
 * One open chart. Changes show at once and are saved to the database a moment later, and right
 * away when the app is hidden, the page closes, or the chart is closed.
 */
export function useChartSession(id: string): ChartSession {
  const chart = useRef<ChartRecord | null>(null);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const undoStack = useRef<ChartContent[]>([]);
  const [status, setStatus] = useState<'loading' | 'missing' | 'ready'>('loading');
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const c = chart.current;
    if (!pending.current || !c) return;
    pending.current = false;
    await saveChart(c.id, c);
  }, []);

  useEffect(() => {
    let alive = true;
    void loadChart(id).then((c) => {
      if (!alive) return;
      chart.current = c;
      undoStack.current = [];
      setStatus(c ? 'ready' : 'missing');
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [flush]);

  const update = useCallback((fn: (c: ChartContent) => ChartContent, opts?: { undoable?: boolean }) => {
    const current = chart.current;
    if (!current) return;
    const next = fn(current);
    if (next === current) return;
    if (opts?.undoable) {
      undoStack.current.push(current);
      if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
    }
    chart.current = { ...current, ...next };
    pending.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    rerender();
  }, [flush]);

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (!previous || !chart.current) return;
    // Undo changes the drawing back, but keeps the current name.
    update((c) => ({ ...previous, name: c.name }));
  }, [update]);

  if (status !== 'ready' || !chart.current) return status === 'missing' ? { status } : { status: 'loading' };
  return { status, chart: chart.current, update, undo, canUndo: undoStack.current.length > 0, flush };
}
