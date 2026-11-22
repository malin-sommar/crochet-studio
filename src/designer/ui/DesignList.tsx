import { useMemo } from 'react';
import { Card, Page } from '../../components/Page';
import { useLiveQuery } from '../../lib/useLiveQuery';
import { tabHref } from '../../router';
import { formatCm, pieceSize } from '../measure';
import { blankDesign, exampleDesign, type DesignContent } from '../model';
import { planDesign } from '../plan';
import { createDesign, listDesigns, type DesignRecord } from '../store';
import { PiecePreview } from './Previews';

async function startDesign(d: DesignContent) {
  const rec = await createDesign(d);
  window.location.hash = tabHref('designer', rec.id);
}

export function DesignList() {
  const designs = useLiveQuery(listDesigns, [], null as DesignRecord[] | null);
  return (
    <Page title="Scarf & blanket maker" lead="Build a scarf or blanket from rows of stitches and colors, see how it will look, and follow it row by row.">
      <div className="actions">
        <button type="button" className="btn primary" onClick={() => void startDesign(blankDesign())}>
          New design
        </button>
        {designs && designs.length > 0 && (
          <button type="button" className="btn" onClick={() => void startDesign(exampleDesign())}>
            Try an example
          </button>
        )}
      </div>
      {designs === null ? null : designs.length === 0 ? (
        <Card title="No designs yet">
          <p>
            Start a new design, or try the example: a striped moss stitch scarf. You can also add a stitch from the
            Stitches tab with "Use in a design".
          </p>
          <div className="actions">
            <button type="button" className="btn" onClick={() => void startDesign(exampleDesign())}>
              Try an example
            </button>
          </div>
        </Card>
      ) : (
        <ul className="chart-list">
          {designs.map((d) => (
            <DesignCard key={d.id} design={d} />
          ))}
        </ul>
      )}
    </Page>
  );
}

function DesignCard({ design }: { design: DesignRecord }) {
  const plan = useMemo(() => planDesign(design), [design]);
  const size = useMemo(() => pieceSize(design, plan), [design, plan]);
  const total = plan.rows.length;
  const started = design.done.length > 0 || design.cur > 1;
  return (
    <li className="chart-card">
      <a className="thumb-link" href={tabHref('designer', design.id)} tabIndex={-1} aria-hidden="true">
        <PiecePreview design={design} plan={plan} size={size} maxWidth={88} maxHeight={88} label="" />
      </a>
      <div className="chart-card-body">
        <h2>
          <a href={tabHref('designer', design.id)}>{design.name}</a>
        </h2>
        <p className="muted">
          About {formatCm(size.widthCm)} × {formatCm(size.heightCm)} · {total} rows
        </p>
        <p className="muted">{started ? `Row ${Math.min(design.cur, total)} · ${design.done.length} of ${total} rows done` : 'Not started'}</p>
        <div className="actions">
          <a className="btn primary" href={tabHref('designer', design.id, 'crochet')}>
            {started ? 'Continue' : 'Crochet'}
          </a>
          <a className="btn" href={tabHref('designer', design.id)}>
            Edit
          </a>
        </div>
      </div>
    </li>
  );
}
