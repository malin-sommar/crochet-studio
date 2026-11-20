import { describe, expect, test } from 'vitest';
import { STITCHES, getStitch } from '../../src/stitches/data';
import { chainFits, foundationText, patternRows, type StitchPattern } from '../../src/stitches/model';
import { fold, searchStitches, searchTerms } from '../../src/stitches/search';
import { drawSwatch, type Shape } from '../../src/stitches/swatch';
import { TERMS, abbr, renderTerms, term, tokensIn } from '../../src/stitches/terms';

const allText = (s: (typeof STITCHES)[number]) => [
  s.usedFor,
  ...s.steps,
  ...(s.tips ?? []),
  ...(s.pattern ? [...s.pattern.setup, ...s.pattern.repeat] : []),
];

describe('the stitch library data', () => {
  test('starts with the 16 agreed stitches', () => {
    expect(STITCHES.map((s) => s.id)).toEqual([
      'ch', 'sl', 'sc', 'hdc', 'dc', 'tr',
      'magic-ring', 'blo-flo',
      'inc', 'sc2tog', 'invisible-dec',
      'moss', 'v-stitch', 'shell', 'puff', 'bobble',
    ]);
  });

  test('ids are unique and "terms" is free for the abbreviations page', () => {
    const ids = STITCHES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('terms');
  });

  for (const s of STITCHES) {
    test(`${s.id}: names, text and links are complete`, () => {
      for (const sys of ['us', 'uk', 'sv'] as const) expect(s.names[sys].name.trim()).not.toBe('');
      expect(typeof s.names.sv.checked).toBe('boolean');
      expect(s.usedFor.length).toBeGreaterThan(20);
      expect(s.steps.length).toBeGreaterThan(0);
      for (const r of s.related) {
        expect(getStitch(r), `related ${r}`).toBeDefined();
        expect(r).not.toBe(s.id);
      }
      // Every {token} must be a known term, so no text shows a raw {token}
      for (const text of allText(s)) for (const t of tokensIn(text)) expect(() => term(t), `{${t}} in ${s.id}`).not.toThrow();
    });

    test(`${s.id}: the swatch can be drawn`, () => {
      const sw = drawSwatch(s.swatch, '#9fb39a');
      expect(sw.width).toBeGreaterThan(0);
      expect(sw.height).toBeGreaterThan(0);
      expect(sw.shapes.length).toBeGreaterThan(3);
      expect(JSON.stringify(sw)).not.toMatch(/NaN|Infinity/);
    });
  }

  test('stitches with a pattern have a sensible repeat for the designer', () => {
    for (const s of STITCHES.filter((x) => x.pattern)) {
      const p = s.pattern!;
      expect(p.multiple, s.id).toBeGreaterThanOrEqual(1);
      expect(p.plus, s.id).toBeGreaterThanOrEqual(0);
      expect(p.repeat.length, s.id).toBeGreaterThan(0);
      expect(p.rowHeight, s.id).toBeGreaterThan(0);
      expect(p.yarn, s.id).toBeGreaterThan(0);
    }
  });
});

describe('patterns', () => {
  const moss = getStitch('moss')!.pattern!;
  const shell = getStitch('shell')!.pattern!;

  test('describe their starting chain in words', () => {
    expect(foundationText(moss)).toBe('Chain an even number.');
    expect(foundationText(shell)).toBe('Chain a multiple of 6, plus 2.');
    expect(foundationText(getStitch('sc')!.pattern!)).toBe('Chain any number, plus 1.');
    expect(foundationText({ multiple: 2, plus: 1 } as StitchPattern)).toBe('Chain an odd number.');
  });

  test('check whether a chain length fits (moss needs an even number)', () => {
    expect(chainFits(moss, 20)).toBe(true);
    expect(chainFits(moss, 21)).toBe(false);
    expect(chainFits(shell, 26)).toBe(true);
    expect(chainFits(shell, 27)).toBe(false);
    expect(chainFits(shell, 2)).toBe(false);
  });

  test('number their rows and say which repeat', () => {
    const r = patternRows(shell);
    expect(r.rows.map((x) => x.n)).toEqual([1, 2, 3]);
    expect([r.repeatFrom, r.repeatTo]).toEqual([2, 3]);
  });
});

describe('terms', () => {
  test('the same stitch has different names in US, UK and Swedish', () => {
    expect(abbr('sc', 'us')).toBe('sc');
    expect(abbr('sc', 'uk')).toBe('dc');
    expect(abbr('sc', 'sv')).toBe('fm');
    expect(abbr('dc', 'uk')).toBe('tr');
    expect(abbr('yo', 'uk')).toBe('yrh');
  });

  test('instructions read in the chosen terms, with sentences capitalised', () => {
    const t = '{ch} 1 (does not count as a stitch), {sc} in each {st} across, {turn}. {sk} the next {st}.';
    expect(renderTerms(t, 'us')).toBe('Ch 1 (does not count as a stitch), sc in each st across, turn. Sk the next st.');
    expect(renderTerms(t, 'uk')).toBe('Ch 1 (does not count as a stitch), dc in each st across, turn. Miss the next st.');
    expect(renderTerms(t, 'sv')).toBe('Lm 1 (does not count as a stitch), fm in each m across, vänd. Hoppa över the next m.');
  });

  test('an unknown token is an error, not silent text', () => {
    expect(() => renderTerms('{nope}', 'us')).toThrow('Unknown term');
  });

  test('every term has all three names', () => {
    for (const t of TERMS) for (const s of ['us', 'uk', 'sv'] as const) expect(t[s].name, `${t.id} ${s}`).toBeTruthy();
  });
});

describe('search', () => {
  const ids = (q: string, terms: 'us' | 'uk' | 'sv' = 'us') => searchStitches(q, { terms }).map((m) => m.stitch.id);

  test('finds a stitch by its Swedish name or abbreviation', () => {
    expect(ids('fast maska')[0]).toBe('sc');
    expect(ids('fm')[0]).toBe('sc');
    expect(ids('okning')).toContain('inc'); // without the ö
  });

  test('"double crochet" finds both the US dc and the UK one (US sc), and says which is which', () => {
    const r = searchStitches('double crochet', { terms: 'us' });
    expect(r[0]!.stitch.id).toBe('dc');
    const sc = r.find((m) => m.stitch.id === 'sc');
    expect(sc?.via).toBe('uk');
  });

  test('in UK terms, "dc" means the US sc first', () => {
    expect(ids('dc', 'uk')[0]).toBe('sc');
    expect(ids('dc', 'us')[0]).toBe('dc');
  });

  test('finds by other names and keywords', () => {
    expect(ids('linen')).toEqual(['moss']);
    expect(ids('magic loop')).toEqual(['magic-ring']);
  });

  test('filters by difficulty and type', () => {
    expect(searchStitches('', { terms: 'us', type: 'texture' }).map((m) => m.stitch.id)).toEqual([
      'moss', 'v-stitch', 'shell', 'puff', 'bobble',
    ]);
    expect(searchStitches('', { terms: 'us', difficulty: 'intermediate' }).map((m) => m.stitch.id)).toEqual(['puff', 'bobble']);
    expect(searchStitches('', { terms: 'us' })).toHaveLength(STITCHES.length);
  });

  test('nothing found is an empty list', () => {
    expect(ids('zzz')).toEqual([]);
  });

  test('the abbreviations list searches all three term systems', () => {
    expect(searchTerms('yrh').map((t) => t.id)).toEqual(['yo']);
    expect(searchTerms('omslag').map((t) => t.id)).toEqual(['yo']);
    expect(searchTerms('tension').map((t) => t.id)).toContain('gauge');
    expect(fold('Ökning')).toBe('okning');
  });
});

describe('swatch drawing', () => {
  const count = (shapes: Shape[]): number =>
    shapes.reduce((n, s) => n + (s.t === 'group' ? 1 : 0), 0);

  test('draws one stitch per stitch: a 9-wide sc swatch of 6 rows has 9 × 6 stitches', () => {
    const sw = drawSwatch({ layout: 'rows', width: 9, cycle: [{ items: [{ k: 'sc' }], fill: true }], count: 6 }, '#9fb39a');
    // fill rows draw a little past both edges (cut off when painted)
    expect(count(sw.shapes)).toBeGreaterThanOrEqual(54);
  });

  test('a shell is five stitches from one point', () => {
    const sw = drawSwatch(
      { layout: 'rows', width: 6, cycle: [{ items: [{ fan: 'dc', n: 5, w: 4 }] }], count: 1 },
      '#9fb39a',
    );
    const posts = sw.shapes.filter((s): s is Extract<Shape, { t: 'group' }> => s.t === 'group');
    expect(posts).toHaveLength(5);
    expect(new Set(posts.map((p) => `${p.x},${p.y}`)).size).toBe(1);
    expect(posts[0]!.rot).toBeLessThan(0);
    expect(posts[4]!.rot).toBeGreaterThan(0);
  });

  test('a magic ring swatch has its rounds of stitches', () => {
    const sw = drawSwatch({ layout: 'round', rounds: [6, 12] }, '#9fb39a');
    expect(count(sw.shapes)).toBe(18);
  });

  test('the same input always draws the same picture', () => {
    const spec = getStitch('shell')!.swatch;
    expect(drawSwatch(spec, '#8c1d3c')).toEqual(drawSwatch(spec, '#8c1d3c'));
  });
});
