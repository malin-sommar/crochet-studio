import { useMemo, useState } from 'react';
import { Page } from '../../components/Page';
import { useLiveQuery } from '../../lib/useLiveQuery';
import { tabHref } from '../../router';
import { DIFFICULTY_LABELS, TYPE_LABELS, type Difficulty, type StitchType } from '../model';
import { stitchesWithNotes } from '../notes';
import { searchStitches } from '../search';
import { PleaseCheck, SYSTEM_LABELS, TermsSwitch, nameWithAbbr, otherNames, useTerms } from './common';
import { SwatchView, useSwatchColor } from './SwatchView';

function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="chips" role="group" aria-label={label}>
      <span className="chips-label">{label}</span>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="chip"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StitchList() {
  const terms = useTerms();
  const [color] = useSwatchColor();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<StitchType | 'all'>('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const withNotes = useLiveQuery(stitchesWithNotes, [], new Set<string>());
  const results = useMemo(() => searchStitches(query, { terms, type, difficulty }), [query, terms, type, difficulty]);

  return (
    <Page title="Stitches" lead="Look up a stitch by its US, UK or Swedish name, see what it makes, and how to work it.">
      <TermsSwitch terms={terms} />
      <label className="field search">
        <span className="visually-hidden">Search stitches</span>
        <input
          type="search"
          value={query}
          placeholder="Search, for example “fast maska” or “dc”"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <FilterChips
        label="Type"
        value={type}
        onChange={setType}
        options={[{ value: 'all' as const, label: 'All' }, ...(Object.keys(TYPE_LABELS) as StitchType[]).map((v) => ({ value: v, label: TYPE_LABELS[v] }))]}
      />
      <FilterChips
        label="Difficulty"
        value={difficulty}
        onChange={setDifficulty}
        options={[
          { value: 'all' as const, label: 'All' },
          ...(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((v) => ({ value: v, label: DIFFICULTY_LABELS[v] })),
        ]}
      />
      <p className="list-meta">
        <span className="muted" role="status">
          {results.length} {results.length === 1 ? 'stitch' : 'stitches'}
        </span>
        <a href={tabHref('stitches', 'terms')}>Abbreviations: US ↔ UK ↔ Swedish →</a>
      </p>

      {results.length === 0 ? (
        <div className="note">
          <p>No stitches match “{query}”{type !== 'all' || difficulty !== 'all' ? ' with these filters' : ''}.</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setQuery('');
              setType('all');
              setDifficulty('all');
            }}
          >
            Show all stitches
          </button>
        </div>
      ) : (
        <ul className="stitch-list">
          {results.map(({ stitch, via }) => {
            const own = stitch.names[terms];
            return (
              <li key={stitch.id}>
                <a className="stitch-card" href={tabHref('stitches', stitch.id)}>
                  <span className="stitch-thumb">
                    <SwatchView spec={stitch.swatch} color={color} label="" />
                  </span>
                  <span className="stitch-card-body">
                    <span className="stitch-name">{nameWithAbbr(own)}</span>
                    <span className="muted small">
                      {otherNames(stitch, terms).map(({ sys, n }, i) => (
                        <span key={sys}>
                          {i > 0 && ' · '}
                          {SYSTEM_LABELS[sys]}: {n.name}
                        </span>
                      ))}
                    </span>
                    {via && (
                      <span className="via small">
                        Found by the {SYSTEM_LABELS[via]} name: {stitch.names[via].name}
                      </span>
                    )}
                    <span className="badges">
                      <span className="badge">{DIFFICULTY_LABELS[stitch.difficulty]}</span>
                      <span className="badge">{TYPE_LABELS[stitch.type]}</span>
                      {withNotes.has(stitch.id) && <span className="badge notes">My notes</span>}
                      {terms === 'sv' && <PleaseCheck n={own} />}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
