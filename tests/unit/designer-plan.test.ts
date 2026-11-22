import { beforeEach, describe, expect, test } from 'vitest';
import { metersPerSc, pieceSize, widthFromCm, yarnEstimate } from '../../src/designer/measure';
import {
  blankDesign,
  exampleDesign,
  newBlock,
  newLine,
  normalizeDesign,
  removeDesignColor,
  type DesignContent,
} from '../../src/designer/model';
import { blockRanges, listRows, planDesign, rowInstructions } from '../../src/designer/plan';
import { createDesign, designFromRecord, duplicateDesign, listDesigns, loadDesign, saveDesign, trashDesign } from '../../src/designer/store';
import { renderTerms } from '../../src/stitches/terms';
import { applyImport, createBackup, readBackup, serializeBackup } from '../../src/storage/backup';
import { listTrash } from '../../src/storage/content';
import { clearDb } from './helpers';

const design = (width: number, blocks: DesignContent['blocks'], extra: Partial<DesignContent> = {}): DesignContent => ({
  ...blankDesign(),
  width,
  blocks,
  ...extra,
});

describe('planning rows', () => {
  const ex = exampleDesign();
  const plan = planDesign(ex);

  test('the example scarf: 2 sc rows, 22 × 6 moss rows, 2 sc rows', () => {
    expect(plan.rows).toHaveLength(2 + 22 * 6 + 2);
    expect(plan.problems).toEqual([]);
    expect(plan.chain).toBe(31);
  });

  test('row 1 goes into the chain; a new stitch starts with its first row; then its cycle continues', () => {
    expect(plan.rows[0]).toMatchObject({ n: 1, stitch: 'sc', kind: 'foundation' });
    expect(plan.rows[1]).toMatchObject({ n: 2, stitch: 'sc', kind: 'cycle' });
    expect(plan.rows[2]).toMatchObject({ n: 3, stitch: 'moss', kind: 'first', belowHasSpaces: false });
    expect(plan.rows[3]).toMatchObject({ n: 4, stitch: 'moss', kind: 'cycle', belowHasSpaces: true });
    // a color change doesn't restart the stitch pattern
    expect(plan.rows[4]).toMatchObject({ n: 5, stitch: 'moss', kind: 'cycle', color: 2 });
    expect(plan.rows.at(-2)).toMatchObject({ stitch: 'sc', kind: 'first', belowHasSpaces: true });
  });

  test('instructions follow the width', () => {
    const t = (n: number) => renderTerms(rowInstructions(plan.rows[n - 1]!, ex.width)!, 'us');
    expect(t(1)).toBe('Sc in the 2nd ch from the hook and in each ch across (30 sts), turn.');
    expect(t(3)).toBe(
      'Ch 2 (makes the first space), sc in the 2nd st, *ch 1, sk the next st, sc in the next st; rep from * across (14 times), turn.',
    );
    expect(t(135)).toBe('Ch 1 (does not count as a stitch), sc in each st and ch-sp across (30 sts), turn.');
  });

  test('shell rows alternate their two cycle rows', () => {
    const p = planDesign(design(25, [newBlock([newLine('shell', 0, 5)])]));
    expect(p.rows.map((r) => r.kind)).toEqual(['foundation', 'cycle', 'cycle', 'cycle', 'cycle']);
    expect(p.rows[1]!.spec).not.toBe(p.rows[2]!.spec);
    expect(p.rows[1]!.spec).toBe(p.rows[3]!.spec);
  });

  test('a width that does not fit is explained, with widths that do', () => {
    const p = planDesign(design(31, [newBlock([newLine('moss', 0, 4)])]));
    expect(p.chain).toBeNull();
    expect(p.rows[0]!.r).toBeNull();
    expect(rowInstructions(p.rows[0]!, 31)).toBeNull();
    expect(p.problems[0]).toMatchObject({ kind: 'width', stitch: 'moss', suggest: [30, 32] });
    expect(p.problems[0]!.message).toContain('Moss stitch needs an even number of stitches');
  });

  test('says when no width fits everything', () => {
    const p = planDesign(design(30, [newBlock([newLine('moss', 0, 2), newLine('shell', 0, 2)])]));
    expect(p.problems.find((x) => x.stitch === 'shell')!.message).toContain('No width fits all of');
  });

  test('warns when bobbles would end up on the back', () => {
    const blocks = [newBlock([newLine('sc', 0, 1), newLine('bobble', 1, 4)])];
    const p = planDesign(design(27, blocks));
    // row 2 is the bobble section's sc row, rows 3 and 5 are bobble rows on right-side rows
    expect(p.problems).toEqual([expect.objectContaining({ kind: 'side', rows: [3, 5] })]);
    expect(planDesign(design(27, blocks, { rightSideFirst: false })).problems).toEqual([]);
  });

  test('loop choice only applies to plain stitches', () => {
    const p = planDesign(design(30, [newBlock([{ ...newLine('sc', 0, 1), loop: 'blo' }, { ...newLine('moss', 0, 1), loop: 'blo' }])]));
    expect(p.rows.map((r) => r.loop)).toEqual(['blo', 'both']);
  });

  test('block ranges for "rows 3–6 × 10"', () => {
    const p = planDesign(design(30, [newBlock([newLine('sc', 0, 2)]), newBlock([newLine('dc', 1, 2), newLine('dc', 2, 2)], 10)]));
    expect(blockRanges(p, 2)).toEqual([
      { from: 1, to: 2 },
      { from: 3, to: 42 },
    ]);
  });

  test('an empty design asks for rows', () => {
    expect(planDesign(design(30, [])).problems[0]!.kind).toBe('empty');
  });

  test('lists row numbers readably', () => {
    expect(listRows([3])).toBe('3');
    expect(listRows([3, 5, 7])).toBe('3, 5 and 7');
    expect(listRows([1, 2, 3, 4, 5, 6, 7, 8])).toBe('1, 2, 3, 4, 5, 6 and 2 more');
  });
});

describe('size and yarn', () => {
  const ex = exampleDesign();
  const plan = planDesign(ex);

  test('size in cm from the gauge', () => {
    const s = pieceSize(ex, plan);
    expect(s.widthCm).toBeCloseTo(18.75, 2);
    // 136 rows as tall as sc rows (moss rows count as sc height), 18 rows per 10 cm
    expect(s.heightCm).toBeCloseTo((136 * 10) / 18, 1);
  });

  test('taller stitches make taller rows', () => {
    const d = design(20, [newBlock([newLine('dc', 0, 9)])]);
    expect(pieceSize(d, planDesign(d)).heightCm).toBeCloseTo((9 * 2 * 10) / 18, 1);
    const inDc = { ...d, gauge: { stitch: 'dc', sts: 16, rows: 9 } };
    expect(pieceSize(inDc, planDesign(inDc)).heightCm).toBeCloseTo(10, 1);
  });

  test('stitches across from a width in cm', () => {
    expect(widthFromCm(ex, 20)).toBe(32);
  });

  test('a weighed swatch gives meters per stitch; without it the estimate is rough', () => {
    expect(metersPerSc(ex)).toEqual({ m: expect.closeTo(0.04375, 5), rough: true });
    const weighed = { ...ex, yarn: { ...ex.yarn, swatchGrams: 10 } };
    // 10 g of a 200 m / 100 g yarn = 20 m for 16 × 18 single crochets
    expect(metersPerSc(weighed)).toEqual({ m: expect.closeTo(20 / 288, 5), rough: false });
  });

  test('meters and balls per color, with 10% extra', () => {
    const weighed = { ...ex, yarn: { ...ex.yarn, swatchGrams: 10 } };
    const y = yarnEstimate(weighed, plan, plan.chain);
    const perSc = 20 / 288;
    // color 1 (Mustard): 44 moss rows of 30 stitches, moss uses 0.85 of sc
    expect(y.meters[1]).toBeCloseTo(44 * 30 * 0.85 * perSc, 3);
    expect(y.balls[1]).toBe(Math.ceil((y.meters[1]! * 1.1) / 200));
    expect(y.totalMeters).toBeCloseTo(y.meters.reduce((a, b) => a + b, 0), 6);
    expect(y.rough).toBe(false);
  });
});

describe('saved designs', () => {
  beforeEach(clearDb);

  test('anything odd in a saved design is read safely', () => {
    expect(normalizeDesign(null)).toBeNull();
    expect(normalizeDesign({ blocks: 'no' })).toBeNull();
    const d = normalizeDesign({
      name: '',
      width: 9999,
      colors: [{ name: 'A', hex: 'nope' }],
      blocks: [
        { times: -3, lines: [{ stitch: 'moss', rows: 0, color: 7, loop: 'blo' }, { stitch: 'unknown', rows: 2 }] },
        { lines: [] },
      ],
      gauge: { stitch: 'nope', sts: 0 },
      yarn: { swatchGrams: -1 },
    })!;
    expect(d).toMatchObject({ name: 'Untitled', width: 400, rightSideFirst: true, cur: 1, done: [] });
    expect(d.colors[0]!.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(d.blocks).toHaveLength(1);
    expect(d.blocks[0]).toMatchObject({ times: 1, lines: [expect.objectContaining({ stitch: 'moss', rows: 1, color: 0, loop: 'both' })] });
    expect(d.gauge).toEqual({ stitch: 'sc', sts: 16, rows: 18 });
    expect(d.yarn.swatchGrams).toBeNull();
  });

  test('removing a color moves its rows to the first color', () => {
    const d = removeDesignColor(exampleDesign(), 1);
    expect(d.colors.map((c) => c.name)).toEqual(['Cream', 'Sage']);
    expect(d.blocks[1]!.lines.map((l) => l.color)).toEqual([0, 1, 0]);
  });

  test('designs are saved, listed, duplicated, trashed and backed up', async () => {
    const d = await createDesign(exampleDesign());
    expect(await loadDesign(d.id)).toEqual(d);
    await saveDesign(d.id, { ...d, cur: 12, done: [1, 2, 3] });
    expect(await loadDesign(d.id)).toMatchObject({ cur: 12, done: [1, 2, 3] });
    const copy = await duplicateDesign(d);
    expect(copy).toMatchObject({ name: 'Striped moss scarf (copy)', cur: 1 });
    expect((await listDesigns()).map((x) => x.id).sort()).toEqual([d.id, copy.id].sort());

    const text = serializeBackup(await createBackup('x'));
    await trashDesign(d.id);
    expect(await loadDesign(d.id)).toBeNull();
    expect(await listTrash()).toEqual([expect.objectContaining({ store: 'designs', name: 'Striped moss scarf' })]);

    await clearDb();
    await applyImport(readBackup(text));
    expect(await loadDesign(d.id)).toMatchObject({ cur: 12, width: 30 });
  });

  test('a record that is not a design stays hidden', () => {
    expect(designFromRecord({ id: 'x', createdAt: 1, updatedAt: 1, name: 'broken' })).toBeNull();
  });
});
