import { createItem, getItem, listItems, moveToTrash, updateItem } from '../storage/content';
import type { BaseRecord } from '../storage/records';
import { normalizeDesign, type DesignContent } from './model';

/** A design as saved in the `designs` store. */
export type DesignRecord = BaseRecord & DesignContent;

const KEYS = ['name', 'width', 'colors', 'blocks', 'gauge', 'yarn', 'rightSideFirst', 'cur', 'done'] as const;

function contentOf(d: DesignContent): DesignContent {
  const out = {} as Record<string, unknown>;
  for (const k of KEYS) out[k] = d[k];
  return out as unknown as DesignContent;
}

/** Reads a saved record defensively. Returns null if it isn't a design (then it's left untouched and hidden). */
export function designFromRecord(r: (BaseRecord & Record<string, unknown>) | undefined): DesignRecord | null {
  if (!r) return null;
  const d = normalizeDesign(r);
  if (!d) {
    console.warn(`Design ${r.id} could not be read and is hidden.`);
    return null;
  }
  return { id: r.id, createdAt: r.createdAt, updatedAt: r.updatedAt, ...d };
}

export async function createDesign(d: DesignContent): Promise<DesignRecord> {
  return designFromRecord(await createItem('designs', { ...structuredClone(contentOf(d)) }))!;
}

export async function saveDesign(id: string, d: DesignContent): Promise<void> {
  await updateItem('designs', id, { ...contentOf(d) });
}

export async function loadDesign(id: string): Promise<DesignRecord | null> {
  return designFromRecord(await getItem('designs', id));
}

export async function listDesigns(): Promise<DesignRecord[]> {
  const out: DesignRecord[] = [];
  for (const r of await listItems('designs')) {
    const d = designFromRecord(r);
    if (d) out.push(d);
  }
  return out;
}

export function duplicateDesign(d: DesignContent): Promise<DesignRecord> {
  return createDesign({ ...structuredClone(contentOf(d)), name: `${d.name} (copy)`.slice(0, 60), cur: 1, done: [] });
}

export function trashDesign(id: string): Promise<void> {
  return moveToTrash('designs', id);
}
