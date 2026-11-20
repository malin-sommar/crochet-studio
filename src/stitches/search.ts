import type { Terms } from '../storage/prefs';
import { STITCHES } from './data';
import type { Difficulty, Stitch, StitchType } from './model';
import { TERMS, type Term } from './terms';

/** Lower case, without accents, so "okning" finds "ökning". */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export interface StitchMatch {
  stitch: Stitch;
  /** If the search matched one of the other term systems' names, which one (to explain the hit). */
  via?: Terms;
}

const SYSTEMS: Terms[] = ['us', 'uk', 'sv'];

function score(text: string, q: string): number {
  if (!text) return 0;
  if (text === q) return 4;
  if (text.startsWith(q)) return 3;
  if (text.split(/[\s/-]+/).some((w) => w.startsWith(q))) return 2;
  return text.includes(q) ? 1 : 0;
}

/**
 * Stitches matching the search text (any of their US, UK or Swedish names, abbreviations or
 * keywords) and filters, best match first. Matches in your own terms rank higher.
 */
export function searchStitches(
  query: string,
  opts: { terms: Terms; difficulty?: Difficulty | 'all'; type?: StitchType | 'all' },
): StitchMatch[] {
  const q = fold(query);
  const order = [opts.terms, ...SYSTEMS.filter((s) => s !== opts.terms)];
  const out: (StitchMatch & { score: number; index: number })[] = [];
  STITCHES.forEach((stitch, index) => {
    if (opts.difficulty && opts.difficulty !== 'all' && stitch.difficulty !== opts.difficulty) return;
    if (opts.type && opts.type !== 'all' && stitch.type !== opts.type) return;
    if (!q) {
      out.push({ stitch, score: 0, index });
      return;
    }
    let best = 0;
    let via: Terms | undefined;
    order.forEach((sys, rank) => {
      const n = stitch.names[sys];
      const s = Math.max(score(fold(n.name), q), score(fold(n.abbr ?? ''), q) + (fold(n.abbr ?? '') === q ? 1 : 0));
      // Your own terms count a little more than the others
      const weighted = s ? s * 10 - rank : 0;
      if (weighted > best) {
        best = weighted;
        via = sys === opts.terms ? undefined : sys;
      }
    });
    for (const k of stitch.keywords ?? []) {
      const s = score(fold(k), q) * 10 - 5;
      if (s > best) {
        best = s;
        via = undefined;
      }
    }
    if (best > 0) out.push({ stitch, via, score: best, index });
  });
  out.sort((a, b) => b.score - a.score || a.index - b.index);
  return out.map(({ stitch, via }) => (via ? { stitch, via } : { stitch }));
}

/** Words in the abbreviations list matching the search, in any of the three term systems. */
export function searchTerms(query: string): Term[] {
  const q = fold(query);
  if (!q) return [...TERMS];
  return TERMS.filter((t) =>
    SYSTEMS.some((s) => score(fold(t[s].name), q) || score(fold(t[s].abbr ?? ''), q)) || fold(t.meaning ?? '').includes(q),
  );
}
