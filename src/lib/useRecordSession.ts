import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { onBeforeLeave } from './pendingSaves';

const SAVE_DELAY_MS = 400;
const UNDO_LIMIT = 60;

export type RecordSession<T> =
  | { status: 'loading' }
  | { status: 'missing' }
  | {
      status: 'ready';
      value: T;
      /** Applies a change and saves it shortly after. `undoable` changes can be undone. */
      update: (fn: (v: T) => T, opts?: { undoable?: boolean }) => void;
      undo: () => void;
      canUndo: boolean;
      /** Saves now (before leaving, deleting, duplicating...). */
      flush: () => Promise<void>;
    };

/**
 * One open saved item. Changes show at once and are saved a moment later, and right away when the
 * app is hidden, the page closes, the item is closed, or the app reloads for an update.
 */
export function useRecordSession<T extends { id: string }>(
  id: string,
  load: (id: string) => Promise<T | null>,
  save: (id: string, value: T) => Promise<void>,
): RecordSession<T> {
  const current = useRef<T | null>(null);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const undoStack = useRef<T[]>([]);
  const [status, setStatus] = useState<'loading' | 'missing' | 'ready'>('loading');
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const v = current.current;
    if (!pending.current || !v) return;
    pending.current = false;
    await saveRef.current(v.id, v);
  }, []);

  useEffect(() => {
    let alive = true;
    void load(id).then((v) => {
      if (!alive) return;
      current.current = v;
      undoStack.current = [];
      setStatus(v ? 'ready' : 'missing');
    });
    return () => {
      alive = false;
    };
    // `load` is a module function; only the id matters.
  }, [id]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    const unregister = onBeforeLeave(flush);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
      unregister();
      void flush();
    };
  }, [flush]);

  const update = useCallback(
    (fn: (v: T) => T, opts?: { undoable?: boolean }) => {
      const v = current.current;
      if (!v) return;
      const next = fn(v);
      if (next === v) return;
      if (opts?.undoable) {
        undoStack.current.push(v);
        if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift();
      }
      current.current = next;
      pending.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
      rerender();
    },
    [flush],
  );

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    update(() => previous);
  }, [update]);

  if (status !== 'ready' || !current.current) return status === 'missing' ? { status } : { status: 'loading' };
  return { status, value: current.current, update, undo, canUndo: undoStack.current.length > 0, flush };
}
