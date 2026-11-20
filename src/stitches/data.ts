import { namesFromTerm, type Stitch } from './model';
import type { SwatchItem } from './swatch';

/** n single crochets, each w units wide (narrower ones show the fabric pulling in). */
const scs = (n: number, w = 1): SwatchItem[] => Array.from({ length: n }, () => ({ k: 'sc' as const, w }));

/**
 * The stitch library. All descriptions and steps are written for this app; nothing is copied from
 * tutorial sites or patterns. Steps use {tokens} (see terms.ts) so they read in US, UK or Swedish
 * terms. Swedish names with `checked: false` show a "please check" mark until confirmed.
 */
export const STITCHES: readonly Stitch[] = [
  // ---------- Basics ----------
  {
    id: 'ch',
    names: namesFromTerm('ch'),
    type: 'basic',
    difficulty: 'beginner',
    usedFor:
      'The start of almost everything: the foundation chain under the first row, the turning chain at the start of a row, and the loops and spaces in lacy patterns.',
    steps: [
      'Make a slip knot and put it on the hook.',
      '{yo}: wrap the yarn over the hook, from back to front.',
      'Pull the yarn through the loop on the hook. That is one {ch}.',
      'Repeat for as many chains as you need. Hold the chain just below the hook between thumb and middle finger so it stays steady.',
    ],
    tips: [
      "When you count chains, don't count the slip knot or the loop on the hook.",
      'Keep chains a little loose: the first row is worked into them, and tight chains make it pull in.',
    ],
    related: ['sl', 'sc', 'magic-ring'],
    swatch: { layout: 'chain', links: 9 },
    keywords: ['foundation', 'turning chain', 'start'],
  },
  {
    id: 'sl',
    names: namesFromTerm('sl'),
    type: 'basic',
    difficulty: 'beginner',
    usedFor:
      'Joining a round to its start, moving along a row without adding height, and neat edges. Rows of {sl} in the back loop make a thin, stretchy fabric.',
    steps: [
      'Insert the hook into the stitch.',
      '{yo} and pull the yarn through the stitch and the loop on the hook in one movement. That is one {sl}.',
    ],
    pattern: {
      multiple: 1,
      plus: 1,
      setup: ['{sl} in the 2nd {ch} from the hook and in each {ch} across, {turn}.'],
      repeat: ['{ch} 1 (does not count as a stitch), {sl} in the back loop of each {st} across, {turn}.'],
      rowHeight: 0.5,
      yarn: 0.8,
    },
    tips: ['Keep slip stitches loose. Tight ones are very hard to work into on the next row.'],
    related: ['ch', 'sc', 'blo-flo'],
    swatch: { layout: 'rows', width: 10, cycle: [{ items: [{ k: 'sl' }], fill: true }], count: 8 },
    keywords: ['join'],
  },
  {
    id: 'sc',
    names: namesFromTerm('sc'),
    type: 'basic',
    difficulty: 'beginner',
    usedFor:
      'A short, firm stitch that makes dense fabric. The base of amigurumi, tapestry crochet and most edgings, and good for bags and anything that should hold its shape.',
    steps: [
      'Insert the hook into the stitch, from front to back.',
      '{yo} and pull up a loop. There are now 2 loops on the hook.',
      '{yo} again and pull through both loops. That is one {sc}.',
    ],
    pattern: {
      multiple: 1,
      plus: 1,
      setup: ['{sc} in the 2nd {ch} from the hook and in each {ch} across, {turn}.'],
      repeat: ['{ch} 1 (does not count as a stitch), {sc} in each {st} across, {turn}.'],
      rowHeight: 1,
      yarn: 1,
    },
    tips: ['Count your stitches at the end of every row for the first few rows: it is easy to miss the last one.'],
    related: ['hdc', 'inc', 'sc2tog', 'blo-flo'],
    swatch: { layout: 'rows', width: 9, cycle: [{ items: [{ k: 'sc' }], fill: true }], count: 6 },
    keywords: ['double crochet uk', 'dense', 'amigurumi'],
  },
  {
    id: 'hdc',
    names: namesFromTerm('hdc'),
    type: 'basic',
    difficulty: 'beginner',
    usedFor:
      'A little taller and softer than {sc}, and quick to work. Warm, flexible fabric for hats, scarves and blankets.',
    steps: [
      '{yo} once before you insert the hook.',
      'Insert the hook into the stitch, {yo} and pull up a loop. There are now 3 loops on the hook.',
      '{yo} and pull through all 3 loops. That is one {hdc}.',
    ],
    pattern: {
      multiple: 1,
      plus: 2,
      setup: ['{hdc} in the 3rd {ch} from the hook and in each {ch} across, {turn}.'],
      repeat: ['{ch} 2 (does not count as a stitch), {hdc} in each {st} across, {turn}.'],
      rowHeight: 1.5,
      yarn: 1.3,
    },
    tips: [
      'Behind the top of each {hdc} there is a third loop. Working into only that loop gives a knit-like rib.',
    ],
    related: ['sc', 'dc'],
    swatch: { layout: 'rows', width: 9, cycle: [{ items: [{ k: 'hdc' }], fill: true }], count: 5 },
    keywords: ['half treble uk'],
  },
  {
    id: 'dc',
    names: namesFromTerm('dc'),
    type: 'basic',
    difficulty: 'easy',
    usedFor:
      'A tall stitch that makes drapey fabric fast. It is the building block of shells, V-stitches and granny squares.',
    steps: [
      '{yo} once.',
      'Insert the hook into the stitch, {yo} and pull up a loop. There are now 3 loops on the hook.',
      '{yo} and pull through 2 loops. There are 2 loops left.',
      '{yo} and pull through the last 2 loops. That is one {dc}.',
    ],
    pattern: {
      multiple: 1,
      plus: 2,
      setup: ['{dc} in the 3rd {ch} from the hook and in each {ch} across, {turn}.'],
      repeat: ['{ch} 2 (does not count as a stitch), {dc} in each {st} across, {turn}.'],
      rowHeight: 2,
      yarn: 1.6,
    },
    tips: [
      'Many patterns count the turning chain as the first stitch ("{ch} 3 counts as {dc}"). Read the pattern\'s notes: it changes where the first and last stitches go.',
    ],
    related: ['hdc', 'tr', 'v-stitch', 'shell'],
    swatch: { layout: 'rows', width: 9, cycle: [{ items: [{ k: 'dc' }], fill: true }], count: 4 },
    keywords: ['treble uk', 'tall'],
  },
  {
    id: 'tr',
    names: namesFromTerm('tr'),
    type: 'basic',
    difficulty: 'easy',
    usedFor: 'A very tall stitch for open, lacy fabric and for filling height quickly, for example in shawls and borders.',
    steps: [
      '{yo} twice.',
      'Insert the hook into the stitch, {yo} and pull up a loop. There are now 4 loops on the hook.',
      '{yo} and pull through 2 loops. 3 loops left.',
      '{yo} and pull through 2 loops. 2 loops left.',
      '{yo} and pull through the last 2 loops. That is one {tr}.',
    ],
    pattern: {
      multiple: 1,
      plus: 3,
      setup: ['{tr} in the 4th {ch} from the hook and in each {ch} across, {turn}.'],
      repeat: ['{ch} 3 (does not count as a stitch), {tr} in each {st} across, {turn}.'],
      rowHeight: 2.6,
      yarn: 2,
    },
    related: ['dc'],
    swatch: { layout: 'rows', width: 9, cycle: [{ items: [{ k: 'tr' }], fill: true }], count: 3 },
    keywords: ['triple crochet', 'double treble uk', 'tall', 'lace'],
  },

  // ---------- Techniques ----------
  {
    id: 'magic-ring',
    names: {
      us: { name: 'Magic ring', abbr: 'MR' },
      uk: { name: 'Magic ring', abbr: 'MR' },
      sv: { name: 'Magisk ring', checked: true },
    },
    type: 'technique',
    difficulty: 'easy',
    usedFor:
      'Starting something worked in rounds (amigurumi, hats, granny squares) with no hole in the middle: the ring pulls completely closed.',
    steps: [
      'Lay the yarn in a loop with the tail end behind the working yarn, and hold where they cross between thumb and middle finger.',
      'Insert the hook through the loop, {yo} with the working yarn and pull up a loop.',
      '{ch} 1 to lock it. This chain does not count as a stitch.',
      'Work the first round of stitches into the ring, over both the loop and the tail. For example 6 {sc}.',
      'Pull the tail firmly to close the ring, then join to the first stitch with a {sl} if the pattern says so.',
    ],
    tips: ['Weave the tail in securely: the ring can loosen again if the tail works free.'],
    related: ['sc', 'inc', 'ch'],
    swatch: { layout: 'round', rounds: [6, 12] },
    keywords: ['magic loop', 'adjustable ring', 'amigurumi', 'round'],
  },
  {
    id: 'blo-flo',
    names: {
      us: { name: 'Back / front loop only', abbr: 'BLO/FLO' },
      uk: { name: 'Back / front loop only', abbr: 'BLO/FLO' },
      sv: { name: 'I bakre / främre maskbågen', checked: true },
    },
    type: 'technique',
    difficulty: 'beginner',
    usedFor:
      'Ridges and stretch. Rows of {sc} in the back loop make a ribbed fabric for cuffs and brims; the unused loops can also be a ledge to work into later.',
    steps: [
      'Look at the top of a stitch: it is a sideways "V" of two loops. The front loop is closer to you, the back loop farther away.',
      'For back loop only ({blo}), insert the hook under just the back loop.',
      'For front loop only ({flo}), insert the hook under just the front loop.',
      'Finish the stitch as usual. The loop you did not use stays as a line across the fabric.',
    ],
    pattern: {
      multiple: 1,
      plus: 1,
      setup: ['{sc} in the 2nd {ch} from the hook and in each {ch} across, {turn}.'],
      repeat: ['{ch} 1 (does not count as a stitch), {sc} in the back loop of each {st} across, {turn}.'],
      rowHeight: 0.9,
      yarn: 1,
    },
    tips: ['Turn a piece of back-loop rows sideways and it looks like knitted ribbing: good for hat brims.'],
    related: ['sc', 'sl'],
    swatch: {
      layout: 'rows',
      width: 9,
      setup: [{ items: [{ k: 'sc' }], fill: true }],
      cycle: [{ items: [{ k: 'sc' }], fill: true, ridge: true }],
      count: 6,
    },
    keywords: ['blo', 'flo', 'ribbing', 'rib', 'loop'],
  },

  // ---------- Increase and decrease ----------
  {
    id: 'inc',
    names: {
      us: { name: 'Increase', abbr: 'inc' },
      uk: { name: 'Increase', abbr: 'inc' },
      sv: { name: 'Ökning', checked: true },
    },
    type: 'incdec',
    difficulty: 'beginner',
    usedFor: 'Making a piece wider: shaping circles, amigurumi, triangles and anything that grows.',
    steps: [
      'Work one {sc} into the stitch.',
      'Work a second {sc} into the same stitch. The row is now one stitch wider.',
    ],
    tips: [
      'Patterns may write it as "inc" or as "2 {sc} in next {st}".',
      'In rounds, spread the increases evenly so the circle stays flat.',
    ],
    related: ['sc2tog', 'sc', 'magic-ring'],
    swatch: {
      layout: 'rows',
      width: 9,
      cycle: [
        { items: scs(6) },
        { items: [...scs(3), { fan: 'sc', n: 2, w: 1.7 }, ...scs(2)] },
        { items: scs(7, 0.96) },
        { items: [...scs(3, 0.96), { fan: 'sc', n: 2, w: 1.7 }, ...scs(3, 0.96)] },
        { items: scs(8, 0.94) },
      ],
      count: 5,
    },
    keywords: ['increase', 'grow', 'wider', '2 in one'],
  },
  {
    id: 'sc2tog',
    names: {
      us: { name: 'Single crochet two together', abbr: 'sc2tog' },
      uk: { name: 'Double crochet two together', abbr: 'dc2tog' },
      sv: { name: '2 fasta maskor tillsammans', abbr: '2 fm tills', checked: false },
    },
    type: 'incdec',
    difficulty: 'easy',
    usedFor: 'Making a piece narrower by joining two stitches into one, for shaping and amigurumi.',
    steps: [
      'Insert the hook into the next stitch, {yo} and pull up a loop. 2 loops on the hook.',
      'Insert the hook into the following stitch, {yo} and pull up a loop. 3 loops on the hook.',
      '{yo} and pull through all 3 loops. Two stitches have become one.',
    ],
    related: ['invisible-dec', 'inc', 'sc'],
    swatch: {
      layout: 'rows',
      width: 9,
      cycle: [
        { items: scs(8, 0.94) },
        { items: [...scs(3, 0.94), { join: 'sc', n: 2, w: 1.8 }, ...scs(3, 0.94)] },
        { items: scs(7, 0.96) },
        { items: [...scs(2, 0.96), { join: 'sc', n: 2, w: 1.8 }, ...scs(3, 0.96)] },
        { items: scs(6) },
      ],
      count: 5,
    },
    keywords: ['decrease', 'dec', 'narrower', 'dc2tog'],
  },
  {
    id: 'invisible-dec',
    names: {
      us: { name: 'Invisible decrease', abbr: 'inv dec' },
      uk: { name: 'Invisible decrease', abbr: 'inv dec' },
      sv: { name: 'Osynlig minskning', checked: false },
    },
    type: 'incdec',
    difficulty: 'easy',
    usedFor:
      'A decrease that leaves no gap or bump, so shaping disappears. The usual decrease in amigurumi worked in {sc}.',
    steps: [
      'Insert the hook under the front loop only of the next stitch.',
      'Without pulling anything through, also insert it under the front loop only of the following stitch. There are 3 loops on the hook.',
      '{yo} and pull through the two front loops. 2 loops on the hook.',
      '{yo} and pull through both loops.',
    ],
    tips: ['It only looks invisible from the side facing you, so use it on the outside of amigurumi.'],
    related: ['sc2tog', 'blo-flo'],
    swatch: {
      layout: 'rows',
      width: 9,
      cycle: [
        { items: scs(8, 0.94) },
        { items: [...scs(3, 0.94), { join: 'sc', n: 2, w: 1.5 }, ...scs(3, 0.94)] },
        { items: scs(7, 0.92) },
      ],
      count: 3,
    },
    keywords: ['decrease', 'amigurumi', 'front loop'],
  },

  // ---------- Textures ----------
  {
    id: 'moss',
    names: {
      us: { name: 'Moss stitch' },
      uk: { name: 'Moss stitch' },
      sv: { name: 'Mosstygn', checked: false },
    },
    type: 'texture',
    difficulty: 'easy',
    usedFor:
      'A flat, woven-looking fabric that does not curl and shows off stripes and color changes. Great for scarves, blankets and bags.',
    steps: [
      'The whole fabric is just {sc} and {ch} 1, alternating.',
      'Every {sc} goes into a chain space of the row below, never into a stitch.',
      'Every chain sits above a {sc} of the row below, so the stitches line up in a brick pattern.',
    ],
    pattern: {
      multiple: 2,
      plus: 0,
      setup: [
        '{sc} in the 4th {ch} from the hook, *{ch} 1, {sk} the next {ch}, {sc} in the next {ch}; {rep} from * across, {turn}.',
      ],
      repeat: [
        '{ch} 2, {sc} in the first {chsp}, *{ch} 1, {sc} in the next {chsp}; {rep} from * across, with the last {sc} in the space under the turning chain, {turn}.',
      ],
      rowHeight: 1,
      yarn: 0.85,
    },
    tips: ['Also called linen stitch or granite stitch.', 'Change color every two rows for a neat woven look.'],
    related: ['sc', 'ch', 'v-stitch'],
    swatch: {
      layout: 'rows',
      width: 10,
      cycle: [
        { items: [{ k: 'sc' }, { gap: 1 }], fill: true },
        { items: [{ k: 'sc' }, { gap: 1 }], fill: true, offset: 1 },
      ],
      count: 8,
    },
    keywords: ['linen stitch', 'granite stitch', 'woven', 'even number'],
  },
  {
    id: 'v-stitch',
    names: {
      us: { name: 'V-stitch', abbr: 'V-st' },
      uk: { name: 'V-stitch', abbr: 'V-st' },
      sv: { name: 'V-maska', checked: false },
    },
    type: 'texture',
    difficulty: 'easy',
    usedFor: 'An open, airy fabric that grows quickly and drapes well: shawls, summer tops and light blankets.',
    steps: [
      'A V-stitch is ({dc}, {ch} 1, {dc}) all in the same stitch or space.',
      'On every row after the first, work each V-stitch into the chain space in the middle of the V below.',
    ],
    pattern: {
      multiple: 3,
      plus: 1,
      setup: [
        'V-stitch in the 5th {ch} from the hook, *{sk} 2 {ch}, V-stitch in the next {ch}; {rep} from * to the last 2 {ch}, {sk} 1 {ch}, {dc} in the last {ch}, {turn}.',
      ],
      repeat: [
        '{ch} 3 (counts as a {dc}), V-stitch in the {chsp} of each V-stitch across, {dc} in the top of the turning chain, {turn}.',
      ],
      rowHeight: 2,
      yarn: 1.4,
    },
    related: ['dc', 'shell', 'moss'],
    swatch: {
      layout: 'rows',
      width: 9,
      cycle: [{ items: [{ fan: 'dc', n: 2, w: 2.2 }, { space: 0.8 }], fill: true }],
      count: 4,
    },
    keywords: ['v st', 'open', 'lace', 'airy'],
  },
  {
    id: 'shell',
    names: {
      us: { name: 'Shell stitch' },
      uk: { name: 'Shell stitch' },
      sv: { name: 'Solfjäder', checked: false },
    },
    type: 'texture',
    difficulty: 'easy',
    usedFor: 'Scalloped rows of fans: pretty blankets, baby clothes and edgings.',
    steps: [
      'A shell is 5 {dc} worked into the same stitch, so they fan out.',
      'Between shells, a {sc} anchors the fabric.',
      'On the next row the shells move half a step: each new shell sits on a {sc}, and each {sc} sits in the middle of a shell.',
    ],
    pattern: {
      multiple: 6,
      plus: 2,
      setup: [
        '{sc} in the 2nd {ch} from the hook, *{sk} 2 {ch}, 5 {dc} in the next {ch}, {sk} 2 {ch}, {sc} in the next {ch}; {rep} from * across, {turn}.',
      ],
      repeat: [
        '{ch} 3 (counts as a {dc}), 2 {dc} in the first {sc}, *{sc} in the middle {dc} of the next shell, 5 {dc} in the next {sc}; {rep} from * to the last shell, {sc} in its middle {dc}, 3 {dc} in the last {sc}, {turn}.',
        '{ch} 1, {sc} in the first {dc}, *5 {dc} in the next {sc}, {sc} in the middle {dc} of the next shell; {rep} from * across, with the last {sc} in the top of the turning chain, {turn}.',
      ],
      rowHeight: 2,
      yarn: 1.5,
    },
    tips: ['Count the stitches in each shell as you go: a shell of 4 or 6 throws the next row off.'],
    related: ['dc', 'v-stitch', 'sc'],
    swatch: {
      layout: 'rows',
      width: 12,
      cycle: [
        { items: [{ k: 'sc' }, { space: 0.5 }, { fan: 'dc', n: 5, w: 4 }, { space: 0.5 }], fill: true },
        { items: [{ k: 'sc' }, { space: 0.5 }, { fan: 'dc', n: 5, w: 4 }, { space: 0.5 }], fill: true, offset: 3 },
      ],
      count: 4,
    },
    keywords: ['fan', 'scallop', 'shells'],
  },
  {
    id: 'puff',
    names: {
      us: { name: 'Puff stitch' },
      uk: { name: 'Puff stitch' },
      sv: { name: 'Puffmaska', checked: false },
    },
    type: 'texture',
    difficulty: 'intermediate',
    usedFor: 'Soft, pillowy bumps: cosy blankets, hats and textured stripes.',
    steps: [
      '{yo}, insert the hook into the stitch, {yo} and pull up a loop. Lift it to about the height of a {dc}. There are 3 loops on the hook.',
      'Repeat step 1 twice more in the same stitch, keeping the loops the same height. There are 7 loops on the hook.',
      '{yo} and pull through all 7 loops.',
      '{ch} 1 to close the puff. This chain does not count as a stitch.',
    ],
    pattern: {
      multiple: 2,
      plus: 0,
      setup: ['{sc} in the 2nd {ch} from the hook and in each {ch} across, {turn}.'],
      repeat: [
        '{ch} 1, {sc} in the first {st}, *puff in the next {st}, {sc} in the next {st}; {rep} from * across, {turn}.',
        '{ch} 1, {sc} in each {st} across (work into the top of each puff, not into its closing chain), {turn}.',
        '{ch} 1, {sc} in the first 2 {sts}, *puff in the next {st}, {sc} in the next {st}; {rep} from * to the last {st}, {sc} in the last {st}, {turn}.',
        '{ch} 1, {sc} in each {st} across, {turn}.',
      ],
      rowHeight: 1.4,
      yarn: 1.8,
    },
    tips: [
      'Keep the loops loose and the same height, or the last {yo} will not go through them all.',
      'Look at both sides after a few rows and choose the one you like as the right side.',
    ],
    related: ['bobble', 'dc', 'sc'],
    swatch: {
      layout: 'rows',
      width: 10,
      setup: [{ items: [{ k: 'sc' }], fill: true }],
      cycle: [
        { items: [{ k: 'sc' }, { k: 'puff' }], fill: true },
        { items: [{ k: 'sc' }], fill: true },
        { items: [{ k: 'puff' }, { k: 'sc' }], fill: true },
        { items: [{ k: 'sc' }], fill: true },
      ],
      count: 7,
    },
    keywords: ['bumps', 'texture', 'cosy', 'puffs'],
  },
  {
    id: 'bobble',
    names: {
      us: { name: 'Bobble stitch' },
      uk: { name: 'Bobble stitch' },
      sv: { name: 'Knopp', checked: false },
    },
    type: 'texture',
    difficulty: 'intermediate',
    usedFor: 'Round, raised bobbles on a flat background: textured blankets, cushions and motifs.',
    steps: [
      '{yo}, insert the hook into the stitch, {yo} and pull up a loop, {yo} and pull through 2 loops. That is an unfinished {dc}: 2 loops on the hook.',
      'Repeat step 1 four more times in the same stitch. There are 6 loops on the hook.',
      '{yo} and pull through all 6 loops.',
      'The bobble pops out on the side facing away from you, so bobbles are usually worked on wrong-side rows. Push it through with a finger if it hides.',
    ],
    pattern: {
      multiple: 4,
      plus: 0,
      setup: ['{sc} in the 2nd {ch} from the hook and in each {ch} across, {turn}.'],
      repeat: [
        '({ws}) {ch} 1, {sc} in the first 3 {sts}, *bobble in the next {st}, {sc} in the next 3 {sts}; {rep} from * across, {turn}.',
        '({rs}) {ch} 1, {sc} in each {st} across, {turn}.',
      ],
      rowHeight: 1,
      yarn: 1.7,
    },
    related: ['puff', 'dc', 'sc'],
    swatch: {
      layout: 'rows',
      width: 12,
      setup: [{ items: [{ k: 'sc' }], fill: true }],
      cycle: [
        { items: [{ k: 'sc' }, { k: 'sc' }, { k: 'sc' }, { k: 'bobble' }], fill: true },
        { items: [{ k: 'sc' }], fill: true },
      ],
      count: 7,
    },
    keywords: ['bobbles', 'knobbly', 'texture', 'raised'],
  },
];

const BY_ID = new Map(STITCHES.map((s) => [s.id, s]));

export function getStitch(id: string): Stitch | undefined {
  return BY_ID.get(id);
}
