import { useMemo, useState } from 'react';
import { Page } from '../../components/Page';
import { tabHref } from '../../router';
import type { Terms } from '../../storage/prefs';
import { STITCHES } from '../data';
import { searchTerms } from '../search';
import type { TermName } from '../terms';
import { PleaseCheck, SYSTEM_LABELS, TermsSwitch, useTerms } from './common';

function Name({ n }: { n: TermName }) {
  return (
    <>
      {n.abbr && n.abbr !== n.name ? (
        <>
          <strong>{n.abbr}</strong> {n.name}
        </>
      ) : (
        <strong>{n.name}</strong>
      )}{' '}
      <PleaseCheck n={n} />
    </>
  );
}

/** Abbreviations and terms, US ↔ UK ↔ Swedish. */
export function TermsPage() {
  const terms = useTerms();
  const [query, setQuery] = useState('');
  const found = useMemo(() => searchTerms(query), [query]);
  const order: Terms[] = [terms, ...(['us', 'uk', 'sv'] as Terms[]).filter((s) => s !== terms)];
  const stitchByTerm = new Map(STITCHES.map((s) => [s.id, s]));

  return (
    <Page
      title="Abbreviations"
      lead="Crochet words in US, UK and Swedish terms. Watch out: the same word can mean different stitches."
      back={{ href: tabHref('stitches'), label: 'Stitches' }}
    >
      <TermsSwitch terms={terms} />
      <label className="field search">
        <span className="visually-hidden">Search abbreviations</span>
        <input type="search" value={query} placeholder="Search, for example “yrh” or “omslag”" onChange={(e) => setQuery(e.target.value)} />
      </label>
      <p className="muted" role="status">
        {found.length} {found.length === 1 ? 'word' : 'words'}
      </p>
      <ul className="term-list">
        {found.map((t) => {
          const stitch = stitchByTerm.get(t.id);
          return (
            <li key={t.id} className="card">
              {order.map((sys, i) => (
                <p key={sys} className={i === 0 ? 'term-own' : 'term-other'}>
                  {i > 0 && <span className="muted">{SYSTEM_LABELS[sys]}: </span>}
                  <Name n={t[sys]} />
                </p>
              ))}
              {t.meaning && <p className="muted">{t.meaning}</p>}
              {stitch && (
                <a href={tabHref('stitches', stitch.id)} className="small">
                  How to make it →
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
