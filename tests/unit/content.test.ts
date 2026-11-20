import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  countItems,
  createItem,
  deleteForever,
  emptyTrash,
  getItem,
  itemName,
  listItems,
  listTrash,
  moveToTrash,
  restoreFromTrash,
  updateItem,
} from '../../src/storage/content';
import { db } from '../../src/storage/db';
import { clearDb } from './helpers';

beforeEach(clearDb);

describe('saving items', () => {
  test('a new item gets an id and dates, and is not in the Trash', async () => {
    const r = await createItem('charts', { name: 'Heart' });
    expect(r.id).toBeTruthy();
    expect(r.createdAt).toBe(r.updatedAt);
    expect(r.deletedAt).toBeUndefined();
    expect(await getItem('charts', r.id)).toEqual(r);
  });

  test('changing an item moves updatedAt forward and keeps id and createdAt', async () => {
    const r = await createItem('designs', { name: 'Scarf' });
    const next = await updateItem('designs', r.id, { name: 'Moss scarf', id: 'hacked', createdAt: 0, deletedAt: 5 });
    expect(next).toMatchObject({ id: r.id, createdAt: r.createdAt, name: 'Moss scarf' });
    expect(next!.updatedAt).toBeGreaterThan(r.updatedAt);
    expect(next!.deletedAt).toBeUndefined();
  });

  test('changing an item that does not exist does nothing', async () => {
    expect(await updateItem('charts', 'missing', { name: 'x' })).toBeUndefined();
    expect(await db.charts.count()).toBe(0);
  });

  test('lists items newest first and counts them across stores', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(1000);
      const a = await createItem('charts', { name: 'A' });
      await createItem('portfolio', { title: 'Blanket' });
      vi.setSystemTime(2000);
      await updateItem('charts', a.id, { name: 'A2' });
      vi.setSystemTime(3000);
      await createItem('charts', { name: 'B' });
    } finally {
      vi.useRealTimers();
    }
    expect((await listItems('charts')).map((r) => r.name)).toEqual(['B', 'A2']);
    expect(await countItems()).toBe(3);
  });
});

describe('the Trash', () => {
  test('a trashed item is hidden but kept, and can be restored', async () => {
    const r = await createItem('charts', { name: 'Heart' });
    await moveToTrash('charts', r.id);

    expect(await getItem('charts', r.id)).toBeUndefined();
    expect(await listItems('charts')).toEqual([]);
    expect(await countItems()).toBe(0);
    expect(await listTrash()).toEqual([expect.objectContaining({ store: 'charts', id: r.id, name: 'Heart' })]);
    expect(await db.charts.get(r.id)).toMatchObject({ name: 'Heart' });

    await restoreFromTrash('charts', r.id);
    const back = await getItem('charts', r.id);
    expect(back).toMatchObject({ name: 'Heart' });
    expect(back!.deletedAt).toBeUndefined();
    expect(back!.updatedAt).toBeGreaterThan(r.updatedAt);
    expect(await listTrash()).toEqual([]);
  });

  test('"delete forever" only removes items that are in the Trash', async () => {
    const live = await createItem('charts', { name: 'Keep me' });
    await deleteForever('charts', live.id);
    expect(await getItem('charts', live.id)).toBeDefined();

    await moveToTrash('charts', live.id);
    await deleteForever('charts', live.id);
    expect(await db.charts.get(live.id)).toBeUndefined();
  });

  test('emptying the Trash removes only trashed items, in every store', async () => {
    const a = await createItem('charts', { name: 'A' });
    const b = await createItem('designs', { name: 'B' });
    await createItem('portfolio', { title: 'C' });
    await moveToTrash('charts', a.id);
    await moveToTrash('designs', b.id);

    expect(await emptyTrash()).toBe(2);
    expect(await listTrash()).toEqual([]);
    expect(await countItems()).toBe(1);
  });
});

test('itemName uses name, then title, then "Untitled"', () => {
  expect(itemName({ id: 'x', createdAt: 1, updatedAt: 1, name: ' Heart ' })).toBe('Heart');
  expect(itemName({ id: 'x', createdAt: 1, updatedAt: 1, title: 'Gift' })).toBe('Gift');
  expect(itemName({ id: 'x', createdAt: 1, updatedAt: 1, name: '  ' })).toBe('Untitled');
});
