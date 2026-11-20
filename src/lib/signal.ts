import { useSyncExternalStore } from 'react';

/** A tiny observable value that React components can follow. */
export interface Signal<T> {
  get(): T;
  set(value: T): void;
  subscribe(listener: () => void): () => void;
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      for (const l of listeners) l();
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export function useSignal<T>(s: Signal<T>): T {
  return useSyncExternalStore(s.subscribe, s.get);
}
