/**
 * The stitch patterns the designer can use, written so the app can count them.
 *
 * A piece is N stitches wide, and every row has exactly N "places": stitches, with each chain
 * space counted as one place. Each row of a pattern is: some places before a repeat, the repeat
 * (worked r times), and some places after it. From that the app writes the row for any width,
 * shows its stitch count, and checks that every row uses exactly the N places of the row below.
 *
 * Every pattern has three kinds of rows:
 *  - `foundation`: the first row of the piece, worked into the starting chain;
 *  - `first`: its first row worked into the stitches of a different stitch pattern below;
 *  - `cycle`: the rows that then repeat.
 *
 * Text uses {tokens} (see stitches/terms.ts) so it reads in US, UK or Swedish terms.
 */

export type Loop = 'both' | 'blo' | 'flo';

export interface TextOpts {
  /** The piece's width in places. */
  n: number;
  /** How many times the repeat is worked in this row. */
  r: number;
  loop: Loop;
  /** The row below has chain spaces (moss, V-stitch), worked into like stitches. */
  belowHasSpaces: boolean;
}

export interface RowSpec {
  /** Places made before the repeat, by one repeat, and after it. */
  makes: [before: number, each: number, after: number];
  /** Places of the row below (or chains, in a foundation row) used the same way. */
  uses: [before: number, each: number, after: number];
  text: (o: TextOpts) => string;
  /** The row leaves chain spaces that the next row works into. */
  hasSpaces?: boolean;
  /** Bobbles pop out on the side facing away, so this row must be worked with the wrong side facing. */
  wrongSide?: boolean;
}

export interface FoundationSpec extends RowSpec {
  /** Chains skipped at the start ("in the 4th chain from the hook" skips 3). */
  skip: number;
}

export interface DesignPattern {
  /** The stitch library id. */
  id: string;
  /** The starting chain is the width plus this many chains. */
  chainExtra: number;
  /** Whether a width (in places) works for this pattern. */
  fits: (n: number) => boolean;
  /** "an even number of stitches, at least 6" */
  fitText: string;
  foundation: FoundationSpec;
  first: RowSpec;
  cycle: RowSpec[];
  /** Plain stitches can be worked in the back or front loop only. */
  plain: boolean;
  /** A special stitch to explain in crochet mode. Text with {tokens}. */
  note?: string;
}

const times = (r: number) => (r === 1 ? 'once' : `${r} times`);
const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const each = (o: TextOpts) =>
  (o.loop === 'blo' ? 'in the back loop of each' : o.loop === 'flo' ? 'in the front loop of each' : 'in each') +
  (o.belowHasSpaces ? ' {st} and {chsp}' : ' {st}');

/** A row of one plain stitch across. */
function plainRow(st: string, turning: number): RowSpec {
  return {
    makes: [0, 1, 0],
    uses: [0, 1, 0],
    text: (o) => `{ch} ${turning} (does not count as a stitch), {${st}} ${each(o)} across (${o.n} {sts}), {turn}.`,
  };
}

function plainFoundation(st: string, turning: number): FoundationSpec {
  return {
    makes: [0, 1, 0],
    uses: [0, 1, 0],
    skip: turning,
    text: (o) => `{${st}} in the ${ordinal(turning + 1)} {ch} from the hook and in each {ch} across (${o.n} {sts}), {turn}.`,
  };
}

function plain(id: string, turning: number): DesignPattern {
  const row = plainRow(id, turning);
  return {
    id,
    chainExtra: turning,
    fits: (n) => n >= 2,
    fitText: 'any number of stitches',
    foundation: plainFoundation(id, turning),
    first: row,
    cycle: [row],
    plain: true,
  };
}

/** An sc row that works into puffs or bobbles too. */
const scRowOverBumps = (what: string): RowSpec => ({
  makes: [0, 1, 0],
  uses: [0, 1, 0],
  text: (o) => `{ch} 1, {sc} ${each(o)} across (work into the top of each ${what}) (${o.n} {sts}), {turn}.`,
});

export const DESIGN_PATTERNS: readonly DesignPattern[] = [
  plain('sl', 1),
  plain('sc', 1),
  plain('hdc', 2),
  plain('dc', 2),
  plain('tr', 3),
  {
    id: 'moss',
    chainExtra: 2,
    fits: (n) => n >= 6 && n % 2 === 0,
    fitText: 'an even number of stitches, at least 6',
    plain: false,
    foundation: {
      skip: 3,
      makes: [2, 2, 0],
      uses: [1, 2, 0],
      hasSpaces: true,
      text: (o) =>
        `{sc} in the 4th {ch} from the hook, *{ch} 1, {sk} the next {ch}, {sc} in the next {ch}; {rep} from * across (${times(o.r)}), {turn}.`,
    },
    first: {
      makes: [2, 2, 0],
      uses: [2, 2, 0],
      hasSpaces: true,
      text: (o) =>
        `{ch} 2 (makes the first space), {sc} in the 2nd {st}, *{ch} 1, {sk} the next {st}, {sc} in the next {st}; {rep} from * across (${times(o.r)}), {turn}.`,
    },
    cycle: [
      {
        makes: [2, 2, 2],
        uses: [2, 2, 2],
        hasSpaces: true,
        text: (o) =>
          `{ch} 2, {sc} in the first {chsp}, *{ch} 1, {sc} in the next {chsp}; {rep} from * (${times(o.r)}), {ch} 1, {sc} in the space under the turning chain, {turn}.`,
      },
    ],
  },
  {
    id: 'v-stitch',
    chainExtra: 2,
    fits: (n) => n >= 8 && n % 3 === 2,
    fitText: 'a multiple of 3 plus 2 stitches, at least 8',
    plain: false,
    note: 'V-stitch: ({dc}, {ch} 1, {dc}) all in the same place.',
    foundation: {
      skip: 4,
      makes: [4, 3, 1],
      uses: [1, 3, 2],
      hasSpaces: true,
      text: (o) =>
        `V-stitch in the 5th {ch} from the hook (the skipped chains count as a {dc}), *{sk} 2 {ch}, V-stitch in the next {ch}; {rep} from * (${times(o.r)}), {sk} 1 {ch}, {dc} in the last {ch}, {turn}.`,
    },
    first: {
      makes: [1, 3, 1],
      uses: [1, 3, 1],
      hasSpaces: true,
      text: (o) =>
        `{ch} 3 (counts as a {dc}), *{sk} the next {st}, V-stitch in the next {st}, {sk} the next {st}; {rep} from * (${times(o.r)}), {dc} in the last {st}, {turn}.`,
    },
    cycle: [
      {
        makes: [1, 3, 1],
        uses: [1, 3, 1],
        hasSpaces: true,
        text: (o) =>
          `{ch} 3 (counts as a {dc}), V-stitch in the {chsp} of each V-stitch across (${times(o.r)}), {dc} in the top of the turning chain, {turn}.`,
      },
    ],
  },
  {
    id: 'shell',
    chainExtra: 1,
    fits: (n) => n >= 13 && n % 6 === 1,
    fitText: 'a multiple of 6 plus 1 stitches, at least 13',
    plain: false,
    note: 'Shell: 5 {dc} in the same stitch.',
    foundation: {
      skip: 1,
      makes: [1, 6, 0],
      uses: [1, 6, 0],
      text: (o) =>
        `{sc} in the 2nd {ch} from the hook, *{sk} 2 {ch}, 5 {dc} in the next {ch}, {sk} 2 {ch}, {sc} in the next {ch}; {rep} from * across (${times(o.r)}), {turn}.`,
    },
    first: {
      makes: [1, 6, 0],
      uses: [1, 6, 0],
      text: (o) =>
        `{ch} 1, {sc} in the first {st}, *{sk} 2 {sts}, 5 {dc} in the next {st}, {sk} 2 {sts}, {sc} in the next {st}; {rep} from * across (${times(o.r)}), {turn}.`,
    },
    cycle: [
      {
        makes: [3, 6, 4],
        uses: [3, 6, 4],
        text: (o) =>
          `{ch} 3 (counts as a {dc}), 2 {dc} in the first {sc}, *{sc} in the middle {dc} of the next shell, 5 {dc} in the next {sc}; {rep} from * (${times(o.r)}), {sc} in the middle {dc} of the last shell, 3 {dc} in the last {sc}, {turn}.`,
      },
      {
        makes: [1, 6, 0],
        uses: [1, 6, 0],
        text: (o) =>
          `{ch} 1, {sc} in the first {dc}, *5 {dc} in the next {sc}, {sc} in the middle {dc} of the next shell; {rep} from * across (${times(o.r)}), with the last {sc} in the top of the turning chain, {turn}.`,
      },
    ],
  },
  {
    id: 'puff',
    chainExtra: 1,
    fits: (n) => n >= 5 && n % 2 === 1,
    fitText: 'an odd number of stitches, at least 5',
    plain: false,
    note: 'Puff: ({yo}, insert, {yo}, pull up a tall loop) 3 times in the same stitch, {yo} and pull through all 7 loops, {ch} 1 to close.',
    foundation: plainFoundation('sc', 1),
    first: plainRow('sc', 1),
    cycle: [
      {
        makes: [1, 2, 0],
        uses: [1, 2, 0],
        text: (o) =>
          `{ch} 1, {sc} in the first {st}, *puff in the next {st}, {sc} in the next {st}; {rep} from * across (${times(o.r)}), {turn}.`,
      },
      scRowOverBumps('puff, not its closing chain'),
      {
        makes: [2, 2, 1],
        uses: [2, 2, 1],
        text: (o) =>
          `{ch} 1, {sc} in the first 2 {sts}, *puff in the next {st}, {sc} in the next {st}; {rep} from * (${times(o.r)}), {sc} in the last {st}, {turn}.`,
      },
      scRowOverBumps('puff, not its closing chain'),
    ],
  },
  {
    id: 'bobble',
    chainExtra: 1,
    fits: (n) => n >= 7 && n % 4 === 3,
    fitText: 'a multiple of 4 plus 3 stitches, at least 7',
    plain: false,
    note: 'Bobble: 5 unfinished {dc} in the same stitch, then {yo} and pull through all 6 loops.',
    foundation: plainFoundation('sc', 1),
    first: plainRow('sc', 1),
    cycle: [
      {
        makes: [3, 4, 0],
        uses: [3, 4, 0],
        wrongSide: true,
        text: (o) =>
          `{ch} 1, {sc} in the first 3 {sts}, *bobble in the next {st}, {sc} in the next 3 {sts}; {rep} from * across (${times(o.r)}), {turn}.`,
      },
      scRowOverBumps('bobble'),
    ],
  },
];

const BY_ID = new Map(DESIGN_PATTERNS.map((p) => [p.id, p]));

export function designPattern(id: string): DesignPattern | undefined {
  return BY_ID.get(id);
}

/** How many times a row's repeat is worked at width n, or null if the row doesn't fit n. */
export function repeats(spec: RowSpec, n: number): number | null {
  const [before, eachPlace, after] = spec.makes;
  const rest = n - before - after;
  if (rest < 0 || rest % eachPlace !== 0) return null;
  return rest / eachPlace;
}

/** Places a row uses of the row below (or chains, for a foundation row) at r repeats. */
export function placesUsed(spec: RowSpec, r: number): number {
  return spec.uses[0] + spec.uses[1] * r + spec.uses[2];
}

export function placesMade(spec: RowSpec, r: number): number {
  return spec.makes[0] + spec.makes[1] * r + spec.makes[2];
}

/** The starting chain for a piece n stitches wide that starts with this pattern. */
export function chainLength(p: DesignPattern, n: number): number {
  return n + p.chainExtra;
}

/** Widths near n that fit every pattern given (closest first), for suggestions. */
export function nearestFits(patterns: readonly DesignPattern[], n: number, howMany = 2): number[] {
  const out: number[] = [];
  for (let d = 0; d <= 200 && out.length < howMany; d++) {
    for (const cand of d === 0 ? [n] : [n - d, n + d]) {
      if (cand >= 2 && cand <= 400 && patterns.every((p) => p.fits(cand)) && !out.includes(cand)) out.push(cand);
    }
  }
  return out.sort((a, b) => Math.abs(a - n) - Math.abs(b - n) || a - b).slice(0, howMany);
}
