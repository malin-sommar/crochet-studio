import { getStitch } from '../stitches/data';
import type { DesignContent } from './model';
import type { Plan } from './plan';

/**
 * Size and yarn for a design, from the gauge swatch. Heights of other stitches and their yarn use
 * are estimates from the stitch library (rowHeight and yarn, compared with single crochet), so the
 * results are "about" figures.
 */

function rowHeight(stitch: string): number {
  return getStitch(stitch)?.pattern?.rowHeight ?? 1;
}

function yarnFactor(stitch: string): number {
  return getStitch(stitch)?.pattern?.yarn ?? 1;
}

/** A chain uses about this much yarn compared with a single crochet. */
const CHAIN_YARN = 0.35;
/** Without a weighed swatch, a single crochet uses about this many times its own width. */
const ROUGH_SC_LENGTH = 7;
export const SPARE = 0.1;

export interface Size {
  widthCm: number;
  heightCm: number;
  /** Height of each row in cm, by row index. */
  rowCm: number[];
}

export function pieceSize(d: DesignContent, plan: Plan): Size {
  const widthCm = (d.width / d.gauge.sts) * 10;
  const gaugeRow = rowHeight(d.gauge.stitch);
  const scRowCm = 10 / d.gauge.rows / gaugeRow;
  const rowCm = plan.rows.map((r) => rowHeight(r.stitch) * scRowCm);
  return { widthCm, heightCm: rowCm.reduce((s, h) => s + h, 0), rowCm };
}

export interface YarnEstimate {
  /** Based on a weighed swatch, or a rough rule of thumb. */
  rough: boolean;
  /** Meters per color (index = color), including the starting chain. */
  meters: number[];
  /** Balls per color, with 10% extra. */
  balls: number[];
  totalMeters: number;
}

/** Meters of yarn one single crochet uses. */
export function metersPerSc(d: DesignContent): { m: number; rough: boolean } {
  const { swatchGrams, metersPerBall, gramsPerBall } = d.yarn;
  if (swatchGrams && swatchGrams > 0) {
    const swatchMeters = (swatchGrams * metersPerBall) / gramsPerBall;
    const perStitch = swatchMeters / (d.gauge.sts * d.gauge.rows);
    return { m: perStitch / yarnFactor(d.gauge.stitch), rough: false };
  }
  const stitchWidthM = 10 / d.gauge.sts / 100;
  return { m: ROUGH_SC_LENGTH * stitchWidthM, rough: true };
}

export function yarnEstimate(d: DesignContent, plan: Plan, chain: number | null): YarnEstimate {
  const { m, rough } = metersPerSc(d);
  const meters = d.colors.map(() => 0);
  for (const r of plan.rows) meters[r.color] = (meters[r.color] ?? 0) + d.width * yarnFactor(r.stitch) * m;
  if (chain && plan.rows[0]) meters[plan.rows[0].color] = (meters[plan.rows[0].color] ?? 0) + chain * CHAIN_YARN * m;
  const balls = meters.map((x) => (x > 0 ? Math.ceil((x * (1 + SPARE)) / d.yarn.metersPerBall) : 0));
  return { rough, meters, balls, totalMeters: meters.reduce((s, x) => s + x, 0) };
}

/** Stitches across for a width in cm, from the gauge. */
export function widthFromCm(d: DesignContent, cm: number): number {
  return Math.max(2, Math.round((cm / 10) * d.gauge.sts));
}

export const formatCm = (cm: number) => (cm >= 100 ? `${Math.round(cm)} cm` : `${(Math.round(cm * 10) / 10).toString()} cm`);
