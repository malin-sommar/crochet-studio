import { Segmented } from '../../components/Segmented';
import { useLiveQuery } from '../../lib/useLiveQuery';
import { DEFAULT_PREFS, TERMS_LABELS, getPrefs, setPrefs, type Terms } from '../../storage/prefs';
import type { Stitch } from '../model';
import type { TermName } from '../terms';

export function useTerms(): Terms {
  return useLiveQuery(getPrefs, [], DEFAULT_PREFS).terms;
}

/** "Names in: US / UK / Swedish", the same setting as in Settings. */
export function TermsSwitch({ terms }: { terms: Terms }) {
  const options = (Object.keys(TERMS_LABELS) as Terms[]).map((value) => ({ value, label: TERMS_LABELS[value] }));
  return (
    <div className="terms-switch">
      <Segmented label="Names in" options={options} value={terms} onChange={(t) => void setPrefs({ terms: t })} />
    </div>
  );
}

export const SYSTEM_LABELS: Record<Terms, string> = { us: 'US', uk: 'UK', sv: 'Swedish' };

/** "Single crochet (sc)" */
export function nameWithAbbr(n: TermName): string {
  return n.abbr && n.abbr.toLowerCase() !== n.name.toLowerCase() ? `${n.name} (${n.abbr})` : n.name;
}

export function PleaseCheck({ n }: { n: TermName }) {
  if (n.checked !== false) return null;
  return (
    <span className="badge unconfirmed" title="This Swedish term hasn't been confirmed yet.">
      please check
    </span>
  );
}

/** The stitch's names in the other two term systems, in a fixed order. */
export function otherNames(stitch: Stitch, terms: Terms): { sys: Terms; n: TermName }[] {
  return (['us', 'uk', 'sv'] as Terms[]).filter((s) => s !== terms).map((sys) => ({ sys, n: stitch.names[sys] }));
}
