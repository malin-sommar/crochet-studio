import type { ChartContent } from './model';

/**
 * Tapestry crochet row instructions. Crochet row 1 is the bottom chart row. Odd rows are worked
 * right to left across the chart, even rows left to right, and the counts are given in that order.
 */

/** [palette index, number of stitches] in the order they're worked. */
export type ColorRun = [color: number, count: number];

export function chartRow(c: ChartContent, n: number): string {
  return c.cells[c.h - n] ?? '';
}

export function isRightToLeft(n: number): boolean {
  return n % 2 === 1;
}

export function tapestryRuns(c: ChartContent, n: number): ColorRun[] {
  let s = chartRow(c, n);
  if (isRightToLeft(n)) s = [...s].reverse().join('');
  const out: ColorRun[] = [];
  let color = s[0];
  let k = 0;
  for (const ch of s) {
    if (ch === color) k++;
    else {
      out.push([Number(color), k]);
      color = ch;
      k = 1;
    }
  }
  if (color !== undefined) out.push([Number(color), k]);
  return out;
}

/** The colors used in a row, by palette index. */
export function rowColors(c: ChartContent, n: number): number[] {
  return [...new Set(chartRow(c, n))].map(Number).sort((a, b) => a - b);
}
