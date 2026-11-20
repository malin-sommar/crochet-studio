import { readDevice, writeDevice } from '../storage/device';

/**
 * How a chart is shown on this device: zoom, drawing tool and the color being painted with.
 * Kept per device (the phone and the computer need different zoom), not backed up.
 */
export interface ChartView {
  zoom: number;
  tool: 'paint' | 'scroll';
  active: number;
}

export const MIN_ZOOM = 6;
export const MAX_ZOOM = 40;
const KEY = 'chart-views';
const MAX_REMEMBERED = 100;

type Saved = Record<string, ChartView & { at: number }>;

function readAll(): Saved {
  try {
    const v = JSON.parse(readDevice(KEY) ?? '{}') as unknown;
    return typeof v === 'object' && v !== null ? (v as Saved) : {};
  } catch {
    return {};
  }
}

export function readChartView(id: string): ChartView | null {
  const v = readAll()[id];
  if (!v) return null;
  return {
    zoom: clampZoom(v.zoom),
    tool: v.tool === 'scroll' ? 'scroll' : 'paint',
    active: Number.isInteger(v.active) && v.active >= 0 ? v.active : 1,
  };
}

export function writeChartView(id: string, view: ChartView): void {
  const all = readAll();
  all[id] = { ...view, at: Date.now() };
  // Forget the views of charts not opened for a long time, so this stays small.
  const ids = Object.keys(all).sort((a, b) => all[b]!.at - all[a]!.at);
  for (const old of ids.slice(MAX_REMEMBERED)) delete all[old];
  writeDevice(KEY, JSON.stringify(all));
}

export function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(Number(z)) || 22));
}

/** A zoom that fits the chart's width into the space available. */
export function fitZoom(chartWidth: number, availablePx: number): number {
  return clampZoom(Math.floor((availablePx - 30) / chartWidth));
}

export function readKeepAwake(): boolean {
  return readDevice('keep-awake') !== 'off';
}

export function writeKeepAwake(on: boolean): void {
  writeDevice('keep-awake', on ? null : 'off');
}
