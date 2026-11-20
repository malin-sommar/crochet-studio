import type { Terms } from '../storage/prefs';

/**
 * Crochet words in US, UK and Swedish terms. The same name can mean different stitches: a US
 * single crochet (sc) is a UK double crochet (dc).
 *
 * Swedish terms marked `checked: false` haven't been confirmed yet; the app shows them with a
 * "please check" mark. Change to `checked: true` (or correct them) once confirmed.
 */

export interface TermName {
  name: string;
  abbr?: string;
  /** Swedish only: false until someone who crochets in Swedish has confirmed it. */
  checked?: boolean;
}

export interface Term {
  id: string;
  us: TermName;
  uk: TermName;
  sv: TermName;
  /** What it means, in plain words. */
  meaning?: string;
}

/** Words used inside instructions as {tokens}, plus general pattern abbreviations. */
export const TERMS: readonly Term[] = [
  { id: 'ch', us: { name: 'chain', abbr: 'ch' }, uk: { name: 'chain', abbr: 'ch' }, sv: { name: 'luftmaska', abbr: 'lm', checked: true } },
  { id: 'sl', us: { name: 'slip stitch', abbr: 'sl st' }, uk: { name: 'slip stitch', abbr: 'ss' }, sv: { name: 'smygmaska', abbr: 'sm', checked: true } },
  { id: 'sc', us: { name: 'single crochet', abbr: 'sc' }, uk: { name: 'double crochet', abbr: 'dc' }, sv: { name: 'fast maska', abbr: 'fm', checked: true } },
  { id: 'hdc', us: { name: 'half double crochet', abbr: 'hdc' }, uk: { name: 'half treble crochet', abbr: 'htr' }, sv: { name: 'halvstolpe', abbr: 'hst', checked: true } },
  { id: 'dc', us: { name: 'double crochet', abbr: 'dc' }, uk: { name: 'treble crochet', abbr: 'tr' }, sv: { name: 'stolpe', abbr: 'st', checked: true } },
  { id: 'tr', us: { name: 'treble crochet', abbr: 'tr' }, uk: { name: 'double treble crochet', abbr: 'dtr' }, sv: { name: 'dubbelstolpe', abbr: 'dst', checked: true } },
  { id: 'sc2tog', us: { name: 'single crochet two together', abbr: 'sc2tog' }, uk: { name: 'double crochet two together', abbr: 'dc2tog' }, sv: { name: '2 fasta maskor tillsammans', abbr: '2 fm tills', checked: false } },
  {
    id: 'yo',
    us: { name: 'yarn over', abbr: 'yo' },
    uk: { name: 'yarn round hook', abbr: 'yrh' },
    sv: { name: 'omslag', abbr: 'oms', checked: true },
    meaning: 'Wrap the yarn over the hook from back to front.',
  },
  { id: 'st', us: { name: 'stitch', abbr: 'st' }, uk: { name: 'stitch', abbr: 'st' }, sv: { name: 'maska', abbr: 'm', checked: true } },
  { id: 'sts', us: { name: 'stitches', abbr: 'sts' }, uk: { name: 'stitches', abbr: 'sts' }, sv: { name: 'maskor', abbr: 'm', checked: true } },
  {
    id: 'sk',
    us: { name: 'skip', abbr: 'sk' },
    uk: { name: 'miss', abbr: 'miss' },
    sv: { name: 'hoppa över', checked: true },
    meaning: "Leave a stitch unworked and go on to the next one.",
  },
  {
    id: 'sp',
    us: { name: 'space', abbr: 'sp' },
    uk: { name: 'space', abbr: 'sp' },
    sv: { name: 'båge', checked: false },
    meaning: 'The gap under a chain, worked into instead of into a stitch.',
  },
  {
    id: 'chsp',
    us: { name: 'chain space', abbr: 'ch-sp' },
    uk: { name: 'chain space', abbr: 'ch-sp' },
    sv: { name: 'luftmaskbåge', abbr: 'lm-båge', checked: false },
    meaning: 'The space under one or more chains.',
  },
  { id: 'tog', us: { name: 'together', abbr: 'tog' }, uk: { name: 'together', abbr: 'tog' }, sv: { name: 'tillsammans', abbr: 'tills', checked: false } },
  { id: 'rep', us: { name: 'repeat', abbr: 'rep' }, uk: { name: 'repeat', abbr: 'rep' }, sv: { name: 'upprepa', checked: true } },
  {
    id: 'rs',
    us: { name: 'right side', abbr: 'RS' },
    uk: { name: 'right side', abbr: 'RS' },
    sv: { name: 'rätsida', checked: true },
    meaning: 'The side that will show when the piece is finished.',
  },
  {
    id: 'ws',
    us: { name: 'wrong side', abbr: 'WS' },
    uk: { name: 'wrong side', abbr: 'WS' },
    sv: { name: 'avigsida', checked: true },
    meaning: 'The back of the work.',
  },
  {
    id: 'blo',
    us: { name: 'back loop only', abbr: 'BLO' },
    uk: { name: 'back loop only', abbr: 'BLO' },
    sv: { name: 'i bakre maskbågen', checked: true },
    meaning: 'Work under only the loop of the stitch top that is farther from you.',
  },
  {
    id: 'flo',
    us: { name: 'front loop only', abbr: 'FLO' },
    uk: { name: 'front loop only', abbr: 'FLO' },
    sv: { name: 'i främre maskbågen', checked: true },
    meaning: 'Work under only the loop of the stitch top that is closer to you.',
  },
  { id: 'inc', us: { name: 'increase', abbr: 'inc' }, uk: { name: 'increase', abbr: 'inc' }, sv: { name: 'ökning', checked: true }, meaning: 'Two stitches in the same stitch, so the row gets one stitch wider.' },
  { id: 'dec', us: { name: 'decrease', abbr: 'dec' }, uk: { name: 'decrease', abbr: 'dec' }, sv: { name: 'minskning', checked: true }, meaning: 'Two stitches joined into one, so the row gets one stitch narrower.' },
  { id: 'rnd', us: { name: 'round', abbr: 'rnd' }, uk: { name: 'round', abbr: 'rnd' }, sv: { name: 'varv', abbr: 'v', checked: true }, meaning: 'One time around when working in a circle.' },
  { id: 'row', us: { name: 'row', abbr: 'row' }, uk: { name: 'row', abbr: 'row' }, sv: { name: 'varv', abbr: 'v', checked: true } },
  { id: 'turn', us: { name: 'turn', abbr: 'turn' }, uk: { name: 'turn', abbr: 'turn' }, sv: { name: 'vänd', checked: true }, meaning: 'Turn the work around to start the next row.' },
  { id: 'beg', us: { name: 'beginning', abbr: 'beg' }, uk: { name: 'beginning', abbr: 'beg' }, sv: { name: 'början', checked: true } },
  {
    id: 'gauge',
    us: { name: 'gauge', abbr: 'gauge' },
    uk: { name: 'tension', abbr: 'tension' },
    sv: { name: 'virkfasthet', checked: false },
    meaning: 'How many stitches and rows fit in 10 cm with your yarn and hook.',
  },
  { id: 'hook', us: { name: 'hook', abbr: 'hook' }, uk: { name: 'hook', abbr: 'hook' }, sv: { name: 'virknål', checked: true } },
  {
    id: 'fasten',
    us: { name: 'fasten off', abbr: 'fasten off' },
    uk: { name: 'fasten off', abbr: 'fasten off' },
    sv: { name: 'klipp av och fäst tråden', checked: false },
    meaning: 'Cut the yarn and pull the end through the last loop.',
  },
  {
    id: 'fpdc',
    us: { name: 'front post double crochet', abbr: 'FPdc' },
    uk: { name: 'front post treble', abbr: 'FPtr' },
    sv: { name: 'reliefstolpe framifrån', checked: false },
    meaning: 'A double crochet worked around the post of the stitch below, from the front.',
  },
  {
    id: 'bpdc',
    us: { name: 'back post double crochet', abbr: 'BPdc' },
    uk: { name: 'back post treble', abbr: 'BPtr' },
    sv: { name: 'reliefstolpe bakifrån', checked: false },
    meaning: 'A double crochet worked around the post of the stitch below, from the back.',
  },
  { id: 'cl', us: { name: 'cluster', abbr: 'cl' }, uk: { name: 'cluster', abbr: 'cl' }, sv: { name: 'kluster', checked: false } },
];

const BY_ID = new Map(TERMS.map((t) => [t.id, t]));

export function term(id: string): Term {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`Unknown term {${id}}`);
  return t;
}

/** The short form in the chosen terms (the name, if there's no short form). */
export function abbr(id: string, terms: Terms): string {
  const n = term(id)[terms];
  return n.abbr ?? n.name;
}

const TOKEN = /\{([a-z0-9]+)\}/g;

/** The term ids used in a text, in order of first use. */
export function tokensIn(text: string): string[] {
  return [...new Set([...text.matchAll(TOKEN)].map((m) => m[1]!))];
}

/**
 * Replaces {tokens} with the short forms in the chosen terms. The first letter of the text and of
 * every sentence is capitalised, as patterns write it ("Ch 1, sc in each st across").
 */
export function renderTerms(text: string, terms: Terms): string {
  return text
    .replace(TOKEN, (_, id: string) => abbr(id, terms))
    .replace(/(^|[.!?]\s+)([a-zåäö])/g, (_, before: string, letter: string) => before + letter.toUpperCase());
}

export function capitalize(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}
