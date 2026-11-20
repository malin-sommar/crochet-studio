import { ChartList } from '../charts/ui/ChartList';
import { ChartScreen } from '../charts/ui/ChartScreen';
import '../charts/ui/charts.css';

/**
 * #/charts              the list
 * #/charts/<id>         one chart, edit mode
 * #/charts/<id>/crochet one chart, crochet mode
 */
export function ChartsPage({ rest }: { rest: string[] }) {
  const [id, mode] = rest;
  if (!id) return <ChartList />;
  return <ChartScreen key={id} id={id} mode={mode === 'crochet' ? 'crochet' : 'edit'} />;
}

/** Crochet mode takes the whole phone screen: no tab bar, no banners. */
export function isFocusRoute(tab: string | null, rest: string[]): boolean {
  return tab === 'charts' && rest.length >= 2 && rest[1] === 'crochet';
}
