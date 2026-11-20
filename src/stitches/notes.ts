import { db } from '../storage/db';
import { nextStamp } from '../storage/records';

/** Your own notes and a favourite video link for one stitch. Saved and backed up. */
export interface StitchNote {
  text: string;
  link: string;
}

export const EMPTY_NOTE: StitchNote = { text: '', link: '' };

export async function getNote(stitchId: string): Promise<StitchNote> {
  const r = await db.stitchNotes.get(stitchId);
  return r ? { text: String(r.text ?? ''), link: String(r.link ?? '') } : EMPTY_NOTE;
}

export async function saveNote(stitchId: string, note: StitchNote): Promise<void> {
  await db.transaction('rw', db.stitchNotes, async () => {
    const current = await db.stitchNotes.get(stitchId);
    if (!current && !note.text.trim() && !note.link.trim()) return;
    const now = nextStamp(current?.updatedAt);
    await db.stitchNotes.put({
      ...current,
      id: stitchId,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      text: note.text,
      link: note.link,
    });
  });
}

/** Ids of the stitches that have notes, to mark them in the list. */
export async function stitchesWithNotes(): Promise<Set<string>> {
  const all = await db.stitchNotes.toArray();
  return new Set(all.filter((r) => String(r.text ?? '').trim() || String(r.link ?? '').trim()).map((r) => r.id));
}

/** A link is only shown as a link if it's a web address. */
export function safeLink(link: string): string | null {
  try {
    const u = new URL(link.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}
