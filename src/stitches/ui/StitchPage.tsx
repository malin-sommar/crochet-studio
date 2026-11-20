import { useEffect, useRef, useState } from 'react';
import { Card, Page } from '../../components/Page';
import { onBeforeLeave } from '../../lib/pendingSaves';
import type { Terms } from '../../storage/prefs';
import { tabHref } from '../../router';
import { getStitch } from '../data';
import { DIFFICULTY_LABELS, TYPE_LABELS, foundationText, patternRows, type Stitch } from '../model';
import { EMPTY_NOTE, getNote, safeLink, saveNote, type StitchNote } from '../notes';
import { renderTerms, term, tokensIn } from '../terms';
import { PleaseCheck, SYSTEM_LABELS, TermsSwitch, nameWithAbbr, useTerms } from './common';
import { SwatchColorPicker, SwatchView, useSwatchColor } from './SwatchView';

function videoSearch(s: Stitch, terms: Terms): string {
  const q =
    terms === 'sv'
      ? `virka ${s.names.sv.name}`
      : terms === 'uk'
        ? `how to crochet ${s.names.uk.name} UK terms`
        : `how to crochet ${s.names.us.name}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

/** The abbreviations used in some texts that need explaining in these terms. */
function AbbreviationKey({ texts, terms }: { texts: string[]; terms: Terms }) {
  const ids = [...new Set(texts.flatMap(tokensIn))];
  const items = ids
    .map(term)
    .filter((t) => {
      const n = t[terms];
      return (n.abbr && n.abbr !== n.name) || terms !== 'us';
    });
  if (!items.length) return null;
  return (
    <dl className="abbr-key">
      {items.map((t) => {
        const n = t[terms];
        return (
          <div key={t.id}>
            <dt>{n.abbr ?? n.name}</dt>
            <dd>
              {n.abbr ? n.name : ''}
              {terms !== 'us' && t.us.name !== n.name && <span className="muted"> (US: {t.us.name})</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function StitchPage({ id }: { id: string }) {
  const terms = useTerms();
  const [color, setColor] = useSwatchColor();
  const s = getStitch(id);

  if (!s) {
    return (
      <Page title="Stitch not found" back={{ href: tabHref('stitches'), label: 'Stitches' }}>
        <p>
          <a className="btn" href={tabHref('stitches')}>
            Back to all stitches
          </a>
        </p>
      </Page>
    );
  }

  const own = s.names[terms];
  const r = (t: string) => renderTerms(t, terms);
  const rows = s.pattern ? patternRows(s.pattern) : null;

  return (
    <Page title={nameWithAbbr(own)} back={{ href: tabHref('stitches'), label: 'Stitches' }}>
      <TermsSwitch terms={terms} />

      <section className="card" aria-label="Names">
        <dl className="names">
          {(['us', 'uk', 'sv'] as Terms[]).map((sys) => (
            <div key={sys} className={sys === terms ? 'own' : ''}>
              <dt>{SYSTEM_LABELS[sys]}</dt>
              <dd>
                {nameWithAbbr(s.names[sys])} <PleaseCheck n={s.names[sys]} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="badges">
          <span className="badge">{DIFFICULTY_LABELS[s.difficulty]}</span>
          <span className="badge">{TYPE_LABELS[s.type]}</span>
        </p>
        <p>{r(s.usedFor)}</p>
      </section>

      <section className="card" aria-label="Swatch">
        <SwatchView spec={s.swatch} color={color} label={`Drawing of a small swatch of ${s.names.us.name}`} className="swatch-large" />
        <SwatchColorPicker value={color} onChange={setColor} />
        <p className="hint">A drawing of what a small piece looks like. Tap a color to see it in other yarn.</p>
      </section>

      <Card title="How to make it" id="how">
        <ol className="steps">
          {s.steps.map((t, i) => (
            <li key={i}>{r(t)}</li>
          ))}
        </ol>
        <AbbreviationKey texts={[...s.steps, ...(s.pattern ? [...s.pattern.setup, ...s.pattern.repeat] : [])]} terms={terms} />
      </Card>

      {s.pattern && rows && (
        <Card title="Pattern" id="pattern">
          <p>
            <strong>{foundationText(s.pattern)}</strong>
          </p>
          <ol className="pattern-rows">
            {rows.rows.map((row) => (
              <li key={row.n}>
                <strong>Row {row.n}:</strong> {r(row.text)}
              </li>
            ))}
          </ol>
          <p>
            {rows.repeatFrom === rows.repeatTo
              ? `Repeat row ${rows.repeatFrom} for the pattern.`
              : `Repeat rows ${rows.repeatFrom}–${rows.repeatTo} for the pattern.`}
          </p>
        </Card>
      )}

      {s.tips && (
        <Card title="Tips" id="tips">
          <ul className="steps">
            {s.tips.map((t, i) => (
              <li key={i}>{r(t)}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Related stitches" id="related">
        <ul className="related">
          {s.related.map((rid) => {
            const rs = getStitch(rid)!;
            return (
              <li key={rid}>
                <a href={tabHref('stitches', rid)} className="related-link">
                  <span className="stitch-thumb small">
                    <SwatchView spec={rs.swatch} color={color} label="" />
                  </span>
                  {nameWithAbbr(rs.names[terms])}
                </a>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Videos" id="videos">
        <p className="hint">Opens a YouTube search for this stitch in a new tab.</p>
        <a className="btn" href={videoSearch(s, terms)} target="_blank" rel="noopener noreferrer">
          Find a video ↗
        </a>
      </Card>

      <NotesCard stitchId={s.id} />
    </Page>
  );
}

function NotesCard({ stitchId }: { stitchId: string }) {
  const [note, setNote] = useState<StitchNote | null>(null);
  const [status, setStatus] = useState('');
  const pending = useRef<StitchNote | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void getNote(stitchId).then((n) => alive && setNote(n));
    const flush = async () => {
      clearTimeout(timer.current);
      const p = pending.current;
      pending.current = null;
      if (p) await saveNote(stitchId, p);
    };
    const off = onBeforeLeave(flush);
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      alive = false;
      off();
      document.removeEventListener('visibilitychange', onHidden);
      void flush();
    };
  }, [stitchId]);

  const change = (n: StitchNote) => {
    setNote(n);
    setStatus('');
    pending.current = n;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const p = pending.current;
      pending.current = null;
      if (p) void saveNote(stitchId, p).then(() => setStatus('Saved'));
    }, 500);
  };

  const current = note ?? EMPTY_NOTE;
  const link = safeLink(current.link);
  return (
    <Card title="My notes" id="notes">
      <label className="field">
        <span>Notes in your own words</span>
        <textarea
          className="code notes"
          rows={4}
          value={current.text}
          disabled={!note}
          placeholder="Tips, how you like to do it, which hook…"
          onChange={(e) => change({ ...current, text: e.target.value })}
        />
      </label>
      <label className="field">
        <span>A favorite video (link)</span>
        <input
          type="url"
          inputMode="url"
          value={current.link}
          disabled={!note}
          placeholder="https://"
          onChange={(e) => change({ ...current, link: e.target.value })}
        />
      </label>
      <p className="muted small" role="status">
        {status || 'Saved automatically and included in backups.'}
      </p>
      {link && (
        <a className="btn" href={link} target="_blank" rel="noopener noreferrer">
          Open my video ↗
        </a>
      )}
    </Card>
  );
}
