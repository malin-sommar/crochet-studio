import { describe, expect, test } from 'vitest';
import {
  addBorder,
  addColor,
  canAddColor,
  clearProgress,
  colorCounts,
  flip,
  goToRow,
  markDoneAndNext,
  mirror,
  previousRow,
  removeColor,
  resize,
  setCell,
  setRowDone,
} from '../../src/charts/edit';
import { EXAMPLE_HEART, blankChart, type ChartContent } from '../../src/charts/model';
import { isRightToLeft, rowColors, tapestryRuns } from '../../src/charts/rows';

const small: ChartContent = {
  ...blankChart(4, 3),
  cells: ['0120', '1100', '0002'],
  pal: [
    { name: 'A', hex: '#ffffff' },
    { name: 'B', hex: '#000000' },
    { name: 'C', hex: '#ff0000' },
  ],
  cur: 2,
  done: [1],
};

describe('editing', () => {
  test('painting one square leaves the others alone', () => {
    expect(setCell(small.cells, 1, 3, 2)).toEqual(['0120', '1102', '0002']);
    expect(small.cells[1]).toBe('1100');
  });

  test('counts stitches per color', () => {
    expect(colorCounts(small)).toEqual([7, 3, 2]);
  });

  test('resizing keeps the drawing from the top-left corner', () => {
    const bigger = resize(small, 6, 4);
    expect(bigger.cells).toEqual(['012000', '110000', '000200', '000000']);
    const smaller = resize(small, 2, 2);
    expect(smaller).toMatchObject({ w: 2, h: 2, cells: ['01', '11'], cur: 2, done: [1] });
    expect(resize({ ...small, cur: 3, done: [1, 3] }, 4, 2)).toMatchObject({ h: 2, cur: 2, done: [1] });
  });

  test('sizes stay between 2 and 200', () => {
    expect(resize(small, 1, 999)).toMatchObject({ w: 2, h: 200 });
  });

  test('the border adds 3 stitches of color A on every side and restarts progress', () => {
    const b = addBorder(small);
    expect(b).toMatchObject({ w: 10, h: 9, done: [] });
    expect(b.cells[0]).toBe('0000000000');
    expect(b.cells[3]).toBe('0000120000');
  });

  test('mirroring keeps progress; flipping moves it with the rows', () => {
    expect(mirror(small)).toMatchObject({ cells: ['0210', '0011', '2000'], cur: 2, done: [1] });
    expect(flip(small)).toMatchObject({ cells: ['0002', '1100', '0120'], cur: 2, done: [3] });
  });

  test('removing a color turns its squares into A and moves later colors up', () => {
    const r = removeColor(small, 1);
    expect(r.cells).toEqual(['0010', '0000', '0001']);
    expect(r.pal.map((p) => p.name)).toEqual(['A', 'C']);
    expect(removeColor(removeColor(r, 1), 1).pal).toHaveLength(2); // never fewer than 2
  });

  test('adds an unused suggested color, up to 8, and none in mosaic', () => {
    const c = addColor(EXAMPLE_HEART);
    expect(c.pal[2]).toEqual({ name: 'Dark green', hex: '#2f4a3a' });
    let full = EXAMPLE_HEART;
    for (let i = 0; i < 10; i++) full = addColor(full);
    expect(full.pal).toHaveLength(8);
    expect(canAddColor({ ...EXAMPLE_HEART, tech: 'mosaic' })).toBe(false);
  });
});

describe('crochet progress', () => {
  test('"done, next row" marks the row and moves up, stopping at the top', () => {
    let c: ChartContent = { ...small, cur: 1, done: [] };
    c = markDoneAndNext(c);
    expect(c).toMatchObject({ cur: 2, done: [1] });
    c = markDoneAndNext(markDoneAndNext(c));
    expect(c).toMatchObject({ cur: 3, done: [1, 2, 3] });
  });

  test('previous, jump, tick and clear', () => {
    expect(previousRow({ ...small, cur: 1 }).cur).toBe(1);
    expect(goToRow(small, 99).cur).toBe(3);
    expect(setRowDone(small, 3, true).done).toEqual([1, 3]);
    expect(setRowDone(small, 1, false).done).toEqual([]);
    expect(clearProgress(small)).toMatchObject({ cur: 1, done: [] });
  });
});

describe('tapestry rows', () => {
  test('row 1 is the bottom row, worked right to left', () => {
    expect(isRightToLeft(1)).toBe(true);
    expect(tapestryRuns(small, 1)).toEqual([
      [2, 1],
      [0, 3],
    ]);
  });

  test('row 2 is worked left to right', () => {
    expect(tapestryRuns(small, 2)).toEqual([
      [1, 2],
      [0, 2],
    ]);
  });

  test('every row adds up to the chart width', () => {
    for (let n = 1; n <= EXAMPLE_HEART.h; n++) {
      const total = tapestryRuns(EXAMPLE_HEART, n).reduce((s, [, k]) => s + k, 0);
      expect(total).toBe(EXAMPLE_HEART.w);
    }
  });

  test('lists the colors a row needs', () => {
    expect(rowColors(small, 3)).toEqual([0, 1, 2]);
    expect(rowColors(small, 1)).toEqual([0, 2]);
  });
});
