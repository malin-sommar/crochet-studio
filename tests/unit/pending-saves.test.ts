import { expect, test } from 'vitest';
import { onBeforeLeave, saveEverything } from '../../src/lib/pendingSaves';

test('saving before a reload waits for every open chart, and a failing one does not stop the rest', async () => {
  const saved: string[] = [];
  const offA = onBeforeLeave(async () => {
    await new Promise((r) => setTimeout(r, 20));
    saved.push('a');
  });
  const offB = onBeforeLeave(async () => {
    throw new Error('disk full');
  });
  const offC = onBeforeLeave(async () => {
    saved.push('c');
  });
  await saveEverything();
  expect(saved.sort()).toEqual(['a', 'c']);

  offA();
  offB();
  offC();
  saved.length = 0;
  await saveEverything();
  expect(saved).toEqual([]);
});
