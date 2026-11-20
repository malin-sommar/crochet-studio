import { liveQuery } from 'dexie';
import { useEffect, useState, type DependencyList } from 'react';

/**
 * Runs a database query and re-runs it whenever the data it read changes
 * (in this tab or another one). Returns `initial` until the first result arrives.
 */
export function useLiveQuery<T>(query: () => Promise<T>, deps: DependencyList, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: setValue,
      error: (e: unknown) => console.error('Database query failed', e),
    });
    return () => sub.unsubscribe();
  }, deps);
  return value;
}
