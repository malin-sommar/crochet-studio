import { beforeEach, expect, test } from 'vitest';
import { EXAMPLE_HEART } from '../../src/charts/model';
import { chartFromRecord, createChart, duplicateChart, listCharts, loadChart, saveChart, trashChart } from '../../src/charts/store';
import { applyImport, createBackup, readBackup, serializeBackup } from '../../src/storage/backup';
import { listTrash } from '../../src/storage/content';
import { db } from '../../src/storage/db';
import { clearDb } from './helpers';

beforeEach(clearDb);

test('a new chart is saved with its content and the shared record fields', async () => {
  const c = await createChart(EXAMPLE_HEART);
  expect(c).toMatchObject({ ...EXAMPLE_HEART, id: expect.any(String) });
  expect(await loadChart(c.id)).toEqual(c);
  expect(Object.keys((await db.charts.get(c.id))!).sort()).toEqual(
    ['cells', 'createdAt', 'cur', 'done', 'h', 'id', 'mfirst', 'name', 'pal', 'rev', 'tech', 'updatedAt', 'w'].sort(),
  );
});

test('saving changes the content and moves updatedAt forward', async () => {
  const c = await createChart(EXAMPLE_HEART);
  await saveChart(c.id, { ...c, cur: 4, done: [1, 2, 3] });
  const saved = await loadChart(c.id);
  expect(saved).toMatchObject({ cur: 4, done: [1, 2, 3] });
  expect(saved!.updatedAt).toBeGreaterThan(c.updatedAt);
});

test('duplicates get a new id and "(copy)" in the name', async () => {
  const c = await createChart(EXAMPLE_HEART);
  const d = await duplicateChart(c);
  expect(d.id).not.toBe(c.id);
  expect(d.name).toBe('Example heart (copy)');
  expect(d.cells).toEqual(c.cells);
});

test('a deleted chart goes to the Trash', async () => {
  const c = await createChart(EXAMPLE_HEART);
  await trashChart(c.id);
  expect(await loadChart(c.id)).toBeNull();
  expect(await listCharts()).toEqual([]);
  expect(await listTrash()).toEqual([expect.objectContaining({ id: c.id, name: 'Example heart', store: 'charts' })]);
});

test('a damaged record is hidden but kept, not deleted', async () => {
  await db.charts.put({ id: 'broken', createdAt: 1, updatedAt: 1, name: 'No squares' });
  expect(chartFromRecord(await db.charts.get('broken'))).toBeNull();
  expect(await listCharts()).toEqual([]);
  expect(await db.charts.get('broken')).toBeDefined();
});

test('charts travel in backups, progress included', async () => {
  const c = await createChart({ ...EXAMPLE_HEART, cur: 7, done: [1, 2, 3, 4, 5, 6] });
  const text = serializeBackup(await createBackup('x'));
  await clearDb();
  await applyImport(readBackup(text));
  expect(await loadChart(c.id)).toEqual(c);
});
