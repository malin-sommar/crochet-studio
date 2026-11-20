import { StitchList } from '../stitches/ui/StitchList';
import { StitchPage } from '../stitches/ui/StitchPage';
import { TermsPage } from '../stitches/ui/TermsPage';
import '../stitches/ui/stitches.css';

/**
 * #/stitches         the list, with search and filters
 * #/stitches/terms   abbreviations, US ↔ UK ↔ Swedish
 * #/stitches/<id>    one stitch
 */
export function StitchesPage({ rest }: { rest: string[] }) {
  const [id] = rest;
  if (!id) return <StitchList />;
  if (id === 'terms') return <TermsPage />;
  return <StitchPage key={id} id={id} />;
}
