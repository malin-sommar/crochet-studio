import { useMemo } from 'react';
import { Page } from '../../components/Page';
import { useRecordSession, type RecordSession } from '../../lib/useRecordSession';
import { tabHref } from '../../router';
import { pieceSize, yarnEstimate } from '../measure';
import { planDesign } from '../plan';
import { loadDesign, saveDesign, type DesignRecord } from '../store';
import { DesignCrochet } from './DesignCrochet';
import { DesignEditor } from './DesignEditor';

export type ReadyDesign = Extract<RecordSession<DesignRecord>, { status: 'ready' }>;

/** Everything worked out from a design, recomputed when it changes. */
export function useDesignFacts(d: DesignRecord) {
  return useMemo(() => {
    const plan = planDesign(d);
    const size = pieceSize(d, plan);
    const yarn = yarnEstimate(d, plan, plan.chain);
    return { plan, size, yarn };
  }, [d]);
}

/** One design, in edit or crochet mode. Both share the open design and its undo history. */
export function DesignScreen({ id, mode }: { id: string; mode: 'edit' | 'crochet' }) {
  const session = useRecordSession<DesignRecord>(id, loadDesign, saveDesign);
  if (session.status === 'loading') {
    return (
      <p className="muted" role="status">
        Opening the design…
      </p>
    );
  }
  if (session.status === 'missing') {
    return (
      <Page title="Design not found" lead="It may have been moved to the Trash. You can restore it from Settings.">
        <p>
          <a className="btn" href={tabHref('designer')}>
            Back to designs
          </a>
        </p>
      </Page>
    );
  }
  return mode === 'crochet' ? <DesignCrochet s={session} /> : <DesignEditor s={session} />;
}
