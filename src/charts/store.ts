import { createItem, getItem, listItems, moveToTrash, updateItem } from '../storage/content';
import type { BaseRecord } from '../storage/records';
import { tryChartFromProject, type ChartContent } from './model';

/** A chart as saved in the `charts` store. */
export type ChartRecord = BaseRecord & ChartContent;

const CONTENT_KEYS = ['name', 'w', 'h', 'cells', 'pal', 'tech', 'rev', 'mfirst', 'cur', 'done'] as const;

function contentOf(c: ChartContent): ChartContent {
  const out = {} as Record<string, unknown>;
  for (const k of CONTENT_KEYS) out[k] = c[k];
  return out as unknown as ChartContent;
}

/**
 * Reads a saved record defensively. Returns null if it isn't a usable chart (it then stays in the
 * database and in backups untouched, but isn't shown).
 */
export function chartFromRecord(r: (BaseRecord & Record<string, unknown>) | undefined): ChartRecord | null {
  if (!r) return null;
  const content = tryChartFromProject(r);
  if (!content) {
    console.warn(`Chart ${r.id} could not be read and is hidden.`);
    return null;
  }
  return { id: r.id, createdAt: r.createdAt, updatedAt: r.updatedAt, ...content };
}

export async function createChart(content: ChartContent): Promise<ChartRecord> {
  const r = await createItem('charts', { ...contentOf(content) });
  return chartFromRecord(r)!;
}

export async function saveChart(id: string, content: ChartContent): Promise<void> {
  await updateItem('charts', id, { ...contentOf(content) });
}

export async function loadChart(id: string): Promise<ChartRecord | null> {
  return chartFromRecord(await getItem('charts', id));
}

/** Charts not in the Trash, most recently changed first. */
export async function listCharts(): Promise<ChartRecord[]> {
  const out: ChartRecord[] = [];
  for (const r of await listItems('charts')) {
    const c = chartFromRecord(r);
    if (c) out.push(c);
  }
  return out;
}

export async function duplicateChart(c: ChartContent): Promise<ChartRecord> {
  return createChart({ ...structuredClone(contentOf(c)), name: `${c.name} (copy)`.slice(0, 60) });
}

export function trashChart(id: string): Promise<void> {
  return moveToTrash('charts', id);
}
