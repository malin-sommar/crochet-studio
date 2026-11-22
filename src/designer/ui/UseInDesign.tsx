import { useState } from 'react';
import { Card } from '../../components/Page';
import { useLiveQuery } from '../../lib/useLiveQuery';
import { tabHref } from '../../router';
import { getStitch } from '../../stitches/data';
import { blankDesign, newBlock, newLine, type DesignContent } from '../model';
import { designPattern, nearestFits, type Loop } from '../patterns';
import { createDesign, listDesigns, loadDesign, saveDesign, type DesignRecord } from '../store';

/** What a stitch page adds to a design: the stitch itself, or sc in the back loop for "BLO/FLO". */
export function designStitchFor(stitchId: string): { stitch: string; loop: Loop } | null {
  if (stitchId === 'blo-flo') return { stitch: 'sc', loop: 'blo' };
  return designPattern(stitchId) ? { stitch: stitchId, loop: 'both' } : null;
}

function blockFor(t: { stitch: string; loop: Loop }, color = 0) {
  return newBlock([{ ...newLine(t.stitch, color, 10), loop: t.loop }]);
}

/** "Use in a design" on a stitch page: start a new design with the stitch, or add it to one. */
export function UseInDesign({ stitchId }: { stitchId: string }) {
  const designs = useLiveQuery(listDesigns, [], [] as DesignRecord[]);
  const [target, setTarget] = useState('');
  const t = designStitchFor(stitchId);
  if (!t) return null;
  const name = getStitch(stitchId)?.names.us.name ?? stitchId;
  const chosen = target || designs[0]?.id || '';

  async function startNew() {
    const base = blankDesign();
    const width = nearestFits([designPattern(t!.stitch)!], base.width, 1)[0] ?? base.width;
    const d: DesignContent = { ...base, name: `${name} design`, width, blocks: [blockFor(t!)] };
    const rec = await createDesign(d);
    window.location.hash = tabHref('designer', rec.id);
  }

  async function addTo(id: string) {
    const d = await loadDesign(id);
    if (!d) return;
    await saveDesign(id, { ...d, blocks: [...d.blocks, blockFor(t!, d.blocks.at(-1)?.lines.at(-1)?.color ?? 0)] });
    window.location.hash = tabHref('designer', id);
  }

  return (
    <Card title="Use in a design" id="use">
      <p className="hint">
        Adds 10 rows of {name.toLowerCase()}
        {t.loop === 'blo' ? ' (single crochet in the back loop)' : ''} to a scarf or blanket design. You can change
        everything afterwards.
      </p>
      <div className="actions">
        <button type="button" className="btn primary" onClick={() => void startNew()}>
          New design with this stitch
        </button>
      </div>
      {designs.length > 0 && (
        <div className="add-to">
          <label className="field">
            <span>Or add to</span>
            <select value={chosen} onChange={(e) => setTarget(e.target.value)}>
              {designs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn" onClick={() => void addTo(chosen)}>
            Add to this design
          </button>
        </div>
      )}
    </Card>
  );
}
