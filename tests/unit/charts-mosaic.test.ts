import { describe, expect, test } from 'vitest';
import { blankChart, type ChartContent } from '../../src/charts/model';
import { backCells, checkMosaic, mosaicRowText, mosaicRuns, rowColor, stitchAt } from '../../src/charts/mosaic';

/** A small seeded random number generator, so failures can be repeated. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mosaicChart(w: number, h: number, mfirst: 0 | 1, rev: boolean): ChartContent {
  return { ...blankChart(w, h), tech: 'mosaic', mfirst, rev };
}

/**
 * Builds the picture that a stitch layout makes. `xs` holds "n,col" for every X: an X in row n
 * covers the square below it (row n - 1) with row n's color.
 */
function pictureFromStitches(base: ChartContent, xs: Set<string>): ChartContent {
  const cells: string[] = [];
  for (let r = 0; r < base.h; r++) {
    const n = base.h - r;
    let row = '';
    for (let col = 0; col < base.w; col++) {
      row += String(xs.has(`${n + 1},${col}`) ? rowColor(base, n + 1) : rowColor(base, n));
    }
    cells.push(row);
  }
  return { ...base, cells };
}

/** A random layout that follows the rules: X from row 3 up, never on the edges, never stacked. */
function randomLegalLayout(base: ChartContent, random: () => number): Set<string> {
  const xs = new Set<string>();
  for (let n = 3; n <= base.h; n++) {
    for (let col = 1; col < base.w - 1; col++) {
      if (!xs.has(`${n - 1},${col}`) && random() < 0.35) xs.add(`${n},${col}`);
    }
  }
  return xs;
}

describe('overlay mosaic round trip', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rev = seed % 2 === 0;
    const mfirst = (seed % 4 < 2 ? 0 : 1) as 0 | 1;
    test(`random layout ${seed} (${rev ? 'reversible' : 'plain'}, row 1 color ${'AB'[mfirst]}) gives the same stitches back`, () => {
      const random = rng(seed);
      const w = 4 + Math.floor(random() * 20);
      const h = 4 + Math.floor(random() * 20);
      const base = mosaicChart(w, h, mfirst, rev);
      const xs = randomLegalLayout(base, random);
      const picture = pictureFromStitches(base, xs);

      expect(checkMosaic(picture).bad.size).toBe(0);
      for (let n = 1; n <= h; n++) {
        for (let col = 0; col < w; col++) {
          const expected = xs.has(`${n},${col}`)
            ? 'X'
            : rev && n >= 4 && xs.has(`${n - 1},${col}`)
              ? 'A'
              : 'sc';
          expect(stitchAt(picture, n, col), `row ${n}, column ${col}`).toBe(expected);
        }
        expect(mosaicRuns(picture, n).reduce((s, [, k]) => s + k, 0)).toBe(w);
      }
    });
  }
});

describe('mosaic rules', () => {
  const base = mosaicChart(5, 5, 0, false); // row 1 = A (0), row 2 = B (1), ...

  test('rows alternate colors, starting with the chosen one', () => {
    expect([1, 2, 3].map((n) => rowColor(base, n))).toEqual([0, 1, 0]);
    expect(rowColor({ ...base, mfirst: 1 }, 1)).toBe(1);
  });

  test('an all-plain chart is fine and all sc', () => {
    const plain = pictureFromStitches(base, new Set());
    expect(checkMosaic(plain).bad.size).toBe(0);
    expect(mosaicRowText(plain, 3)).toBe('5 sc');
  });

  test('rows are written right to left', () => {
    const c = pictureFromStitches(base, new Set(['3,1']));
    // column 1 from the left is stitch 4 from the right
    expect(mosaicRowText(c, 3)).toBe('3 sc, 1 X, 1 sc');
  });

  const withSquare = (n: number, col: number, value: string, from = pictureFromStitches(base, new Set())) => {
    const cells = from.cells.slice();
    const r = from.h - n;
    cells[r] = cells[r]!.slice(0, col) + value + cells[r]!.slice(col + 1);
    return { ...from, cells };
  };

  test.each([
    ['a square in row 1', 1, 2, 'row 1 can only be its own color'],
    ['a square in the top row', 5, 2, 'the top row can only be its own color'],
    ['a square on the edge', 3, 0, 'the edge stitches are always sc'],
  ])('flags %s', (_label, n, col, message) => {
    const c = withSquare(n, col, String(1 - rowColor(base, n)));
    const check = checkMosaic(c);
    expect(check.bad.has(`${base.h - n},${col}`)).toBe(true);
    expect(check.messages[0]).toContain(message);
  });

  test('flags two other-color squares on top of each other', () => {
    let c = withSquare(2, 2, String(1 - rowColor(base, 2)));
    c = withSquare(3, 2, String(1 - rowColor(base, 3)), c);
    const check = checkMosaic(c);
    expect(check.messages[0]).toContain('two X on top of each other');
    expect(check.bad.size).toBe(2);
  });

  test('flags colors other than A and B', () => {
    const c = withSquare(3, 2, '2');
    expect(checkMosaic(c).messages[0]).toContain('only colors A and B');
  });

  test('lists at most six problems', () => {
    const c = { ...base, cells: base.cells.map(() => '22222') };
    expect(checkMosaic(c).messages).toHaveLength(6);
    expect(checkMosaic(c).bad.size).toBe(25);
  });

  test('the back is mirrored with the colors swapped', () => {
    const c = { ...base, cells: ['01100', '00000', '00000', '00000', '00000'] };
    expect(backCells(c)[0]).toEqual([1, 1, 0, 0, 1]);
  });
});
