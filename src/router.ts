import { useSyncExternalStore } from 'react';

/**
 * Pages are addressed with the part of the URL after `#`, like `#/charts` or `#/stitches/sc`.
 * This works on any static host and offline, with no server set-up.
 */

export const TABS = [
  { id: 'charts', label: 'Charts' },
  { id: 'stitches', label: 'Stitches' },
  { id: 'designer', label: 'Designer' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'settings', label: 'Settings' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export type Route = { tab: TabId; rest: string[] } | { tab: null; path: string };

const TAB_IDS = new Set<string>(TABS.map((t) => t.id));

export function isTab(value: unknown): value is TabId {
  return typeof value === 'string' && TAB_IDS.has(value);
}

function decode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

/** Reads a location hash. Returns null for an empty hash (the app then opens the start tab). */
export function parseHash(hash: string): Route | null {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  if (!path) return null;
  const [first, ...rest] = path.split('/').map(decode);
  if (isTab(first)) return { tab: first, rest };
  return { tab: null, path };
}

export function tabHref(tab: TabId, ...rest: string[]): string {
  return '#/' + [tab, ...rest].map(encodeURIComponent).join('/');
}

/** The tab to open when no page is given: the last main tab used on this device, else Charts. */
export function startTab(saved: string | null): TabId {
  return isTab(saved) && saved !== 'settings' ? saved : 'charts';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}
