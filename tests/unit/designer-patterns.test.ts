import { describe, expect, test } from 'vitest';
import {
  DESIGN_PATTERNS,
  chainLength,
  designPattern,
  nearestFits,
  placesMade,
  placesUsed,
  repeats,
  type RowSpec,
} from '../../src/designer/patterns';
import { getStitch } from '../../src/stitches/data';
import { chainFits } from '../../src/stitches/model';
import { renderTerms, tokensIn, term } from '../../src/stitches/terms';

const widths = Array.from({ length: 160 }, (_, i) => i + 2);

describe('every row of every pattern adds up to the width', () => {
  for (const p of DESIGN_PATTERNS) {
    const fitting = widths.filter(p.fits);

    test(`${p.id}: fits ${p.fitText}`, () => {
      expect(fitting.length).toBeGreaterThan(5);
    });

    test(`${p.id}: the foundation row uses the starting chain exactly`, () => {
      for (const n of fitting) {
        const r = repeats(p.foundation, n);
        expect(r, `width ${n}`).not.toBeNull();
        expect(r!, `width ${n}`).toBeGreaterThanOrEqual(1);
        expect(placesMade(p.foundation, r!)).toBe(n);
        expect(p.foundation.skip + placesUsed(p.foundation, r!), `chain for width ${n}`).toBe(chainLength(p, n));
      }
    });

    const rows: [string, RowSpec][] = [['first row', p.first], ...p.cycle.map((c, i) => [`cycle row ${i + 1}`, c] as [string, RowSpec])];
    for (const [label, spec] of rows) {
      test(`${p.id}: ${label} makes and uses exactly the width`, () => {
        for (const n of fitting) {
          const r = repeats(spec, n);
          expect(r, `width ${n}`).not.toBeNull();
          expect(placesMade(spec, r!), `made at width ${n}`).toBe(n);
          expect(placesUsed(spec, r!), `used at width ${n}`).toBe(n);
          if (!p.plain) expect(r!, `width ${n}`).toBeGreaterThanOrEqual(1);
        }
      });
    }

    test(`${p.id}: no width outside the rule is accepted by any row`, () => {
      for (const n of widths.filter((w) => !p.fits(w) && w >= 13)) {
        const ok = [p.foundation, p.first, ...p.cycle].every((s) => repeats(s, n) !== null);
        // plain stitches fit everything; textures must reject widths that break a row
        if (!p.plain) expect(ok, `width ${n}`).toBe(false);
      }
    });

    test(`${p.id}: text reads in all three term systems`, () => {
      const n = fitting[3]!;
      for (const spec of [p.foundation, p.first, ...p.cycle]) {
        const t = spec.text({ n, r: repeats(spec, n)!, loop: 'both', belowHasSpaces: false });
        for (const id of tokensIn(t)) expect(() => term(id)).not.toThrow();
        for (const terms of ['us', 'uk', 'sv'] as const) {
          const out = renderTerms(t, terms);
          expect(out).not.toMatch(/[{}]|NaN|undefined|-1/);
        }
      }
    });

    test(`${p.id}: agrees with the stitch library's chain rule`, () => {
      const lib = getStitch(p.id)!.pattern!;
      for (const n of fitting) expect(chainFits(lib, chainLength(p, n)), `width ${n}`).toBe(true);
    });
  }
});

describe('row text', () => {
  test('moss rows for a width of 10', () => {
    const moss = designPattern('moss')!;
    const at = (spec: RowSpec) => renderTerms(spec.text({ n: 10, r: repeats(spec, 10)!, loop: 'both', belowHasSpaces: false }), 'us');
    expect(at(moss.foundation)).toBe('Sc in the 4th ch from the hook, *ch 1, sk the next ch, sc in the next ch; rep from * across (4 times), turn.');
    expect(at(moss.cycle[0]!)).toBe(
      'Ch 2, sc in the first ch-sp, *ch 1, sc in the next ch-sp; rep from * (3 times), ch 1, sc in the space under the turning chain, turn.',
    );
  });

  test('plain rows say the stitch count, the loop, and chain spaces below', () => {
    const sc = designPattern('sc')!;
    expect(renderTerms(sc.first.text({ n: 30, r: 30, loop: 'blo', belowHasSpaces: true }), 'uk')).toBe(
      'Ch 1 (does not count as a stitch), dc in the back loop of each st and ch-sp across (30 sts), turn.',
    );
    expect(renderTerms(designPattern('dc')!.foundation.text({ n: 20, r: 20, loop: 'both', belowHasSpaces: false }), 'us')).toBe(
      'Dc in the 3rd ch from the hook and in each ch across (20 sts), turn.',
    );
  });
});

test('suggests the nearest widths that fit several patterns', () => {
  const moss = designPattern('moss')!;
  const shell = designPattern('shell')!;
  expect(nearestFits([moss], 55)).toEqual([54, 56]);
  expect(nearestFits([moss, designPattern('sc')!], 54)).toEqual([54, 52]);
  // shell needs 6k+1, which is always odd, so it never fits together with moss
  expect(nearestFits([moss, shell], 55)).toEqual([]);
  expect(nearestFits([shell, designPattern('puff')!], 50)).toEqual([49, 55]);
});
