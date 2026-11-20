/**
 * Changes waiting to be saved (a chart saves a moment after each edit). Anything that reloads the
 * page on purpose, like "Update now", calls saveEverything() first so nothing is lost.
 */
const flushers = new Set<() => Promise<void>>();

/** Registers a function that saves pending changes. Returns a function that unregisters it. */
export function onBeforeLeave(flush: () => Promise<void>): () => void {
  flushers.add(flush);
  return () => {
    flushers.delete(flush);
  };
}

export async function saveEverything(): Promise<void> {
  await Promise.all(
    [...flushers].map((f) =>
      f().catch((e: unknown) => {
        console.error('Saving before leaving failed', e);
      }),
    ),
  );
}
