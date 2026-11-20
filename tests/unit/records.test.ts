import { afterEach, describe, expect, test, vi } from 'vitest';
import { newId } from '../../src/storage/ids';
import { isRecord, nextStamp } from '../../src/storage/records';

describe('nextStamp', () => {
  test('uses the current time for a new record', () => {
    expect(nextStamp(undefined, 1000)).toBe(1000);
  });

  test('always moves forward, even if the clock went back', () => {
    expect(nextStamp(5000, 1000)).toBe(5001);
    expect(nextStamp(5000, 9000)).toBe(9000);
  });
});

describe('isRecord', () => {
  test('accepts a record with id and dates', () => {
    expect(isRecord({ id: 'a', createdAt: 1, updatedAt: 2 })).toBe(true);
    expect(isRecord({ id: 'a', createdAt: 1, updatedAt: 2, deletedAt: 3, name: 'x' })).toBe(true);
  });

  test.each([
    ['null', null],
    ['an array', []],
    ['no id', { createdAt: 1, updatedAt: 2 }],
    ['empty id', { id: '', createdAt: 1, updatedAt: 2 }],
    ['text date', { id: 'a', createdAt: '1', updatedAt: 2 }],
    ['bad deletedAt', { id: 'a', createdAt: 1, updatedAt: 2, deletedAt: 'yes' }],
  ])('rejects %s', (_label, value) => {
    expect(isRecord(value)).toBe(false);
  });
});

describe('newId', () => {
  afterEach(() => vi.unstubAllGlobals());

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  test('makes unique UUIDs', () => {
    const ids = new Set(Array.from({ length: 500 }, newId));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(UUID);
  });

  test('still works on pages without crypto.randomUUID (plain http)', () => {
    vi.stubGlobal('crypto', { getRandomValues: (b: Uint8Array) => b.map(() => Math.floor(Math.random() * 256)) });
    expect(newId()).toMatch(UUID);
  });
});
