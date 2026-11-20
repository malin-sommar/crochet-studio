import type { SwatchSpec } from './swatch';
import { capitalize, term, type TermName } from './terms';

export type Difficulty = 'beginner' | 'easy' | 'intermediate';
export type StitchType = 'basic' | 'incdec' | 'technique' | 'texture';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  easy: 'Easy',
  intermediate: 'Intermediate',
};

export const TYPE_LABELS: Record<StitchType, string> = {
  basic: 'Basic',
  incdec: 'Increase & decrease',
  technique: 'Technique',
  texture: 'Texture',
};

/**
 * A stitch pattern that makes fabric in rows. The scarf and blanket maker uses these numbers for
 * its stitch-count check, size and yarn estimates.
 */
export interface StitchPattern {
  /** The starting chain is a multiple of `multiple`, plus `plus` (multiple 1 = any number). */
  multiple: number;
  plus: number;
  /** Rows worked once at the start, then the rows that repeat. Text with {tokens}. */
  setup: string[];
  repeat: string[];
  /** How tall one row is, compared with a row of single crochet. */
  rowHeight: number;
  /** About how much yarn the fabric uses per stitch width, compared with single crochet. */
  yarn: number;
}

export interface Stitch {
  id: string;
  names: { us: TermName; uk: TermName; sv: TermName };
  type: StitchType;
  difficulty: Difficulty;
  /** What it's good for, in a sentence or two. */
  usedFor: string;
  /** How to make one, step by step. Text with {tokens}. */
  steps: string[];
  pattern?: StitchPattern;
  tips?: string[];
  /** Ids of related stitches. */
  related: string[];
  swatch: SwatchSpec;
  /** Extra words to find it by. */
  keywords?: string[];
}

/** Names taken from the terms table, capitalised (for the basic stitches). */
export function namesFromTerm(id: string): Stitch['names'] {
  const t = term(id);
  const cap = (n: TermName): TermName => ({ ...n, name: capitalize(n.name) });
  return { us: cap(t.us), uk: cap(t.uk), sv: cap(t.sv) };
}

/** "Chain any number, plus 2." / "Chain a multiple of 6, plus 2." / "Chain an even number." */
export function foundationText(p: StitchPattern): string {
  if (p.multiple === 1) return p.plus ? `Chain any number, plus ${p.plus}.` : 'Chain any number.';
  if (p.multiple === 2 && p.plus === 0) return 'Chain an even number.';
  if (p.multiple === 2 && p.plus === 1) return 'Chain an odd number.';
  return p.plus ? `Chain a multiple of ${p.multiple}, plus ${p.plus}.` : `Chain a multiple of ${p.multiple}.`;
}

/** Whether a starting chain of this length fits the pattern. */
export function chainFits(p: StitchPattern, chains: number): boolean {
  return chains >= p.multiple + p.plus && (chains - p.plus) % p.multiple === 0;
}

/** The pattern's rows, numbered, and which rows repeat. */
export function patternRows(p: StitchPattern): { rows: { n: number; text: string }[]; repeatFrom: number; repeatTo: number } {
  const rows = [...p.setup, ...p.repeat].map((text, i) => ({ n: i + 1, text }));
  return { rows, repeatFrom: p.setup.length + 1, repeatTo: p.setup.length + p.repeat.length };
}
