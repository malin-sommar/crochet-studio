import { DesignList } from '../designer/ui/DesignList';
import { DesignScreen } from '../designer/ui/DesignScreen';
import '../designer/ui/designer.css';

/**
 * #/designer              the list of designs
 * #/designer/<id>         one design, edit mode
 * #/designer/<id>/crochet one design, crochet mode
 */
export function DesignerPage({ rest }: { rest: string[] }) {
  const [id, mode] = rest;
  if (!id) return <DesignList />;
  return <DesignScreen key={id} id={id} mode={mode === 'crochet' ? 'crochet' : 'edit'} />;
}
