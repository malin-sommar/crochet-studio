import type { ReactNode } from 'react';
import { Card, Page } from '../components/Page';
import { tabHref } from '../router';

function ComingSoon({ phase, items, note }: { phase: number; items: ReactNode[]; note?: ReactNode }) {
  return (
    <Card title={`Coming in phase ${phase}`}>
      <ul className="checklist">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      {note && <p className="muted">{note}</p>}
    </Card>
  );
}

export function ChartsPage() {
  return (
    <Page title="Charts" lead="Draw or import tapestry and mosaic charts, then follow them row by row.">
      <ComingSoon
        phase={2}
        items={[
          'Everything from the Tapestry Chart Tracker: drawing with up to 8 colors, importing from a picture or a PDF, mosaic mode, crochet mode and PDF export.',
          'Project files (.json) saved from the tracker open here unchanged.',
        ]}
        note="Until then, keep using the tracker. Before switching, save each chart there as a project file."
      />
    </Page>
  );
}

export function StitchesPage() {
  return (
    <Page
      title="Stitches"
      lead="Look up stitches with their US, UK and Swedish names, a picture of what they make, and steps to follow."
    >
      <ComingSoon
        phase={3}
        items={[
          'About 15 stitches to start: the basics, increases and decreases, and textures like moss, shell and bobble.',
          'Search, and filter by difficulty and type.',
          '"Use in designer" adds a stitch to a scarf or blanket.',
        ]}
      />
    </Page>
  );
}

export function DesignerPage() {
  return (
    <Page title="Scarf & blanket maker" lead="Build a scarf or blanket from rows of stitches and colors, and see how it will look.">
      <ComingSoon
        phase={4}
        items={[
          'Rows with a stitch, a color and a loop (both, front or back), and repeats like "rows 3–6 × 10".',
          'A live picture of the piece, and its size from your gauge swatch.',
          'Meters of yarn per color, and how many balls to buy.',
          'A crochet mode that takes you through it row by row.',
        ]}
      />
    </Page>
  );
}

export function PortfolioPage() {
  return (
    <Page title="Portfolio" lead="Photos and notes for every project: planned, in progress, finished or frogged.">
      <ComingSoon
        phase={5}
        items={[
          'Photos with a cover photo, the yarn and hook, dates, time spent, who it is for, and what you learned.',
          'A gallery, and a page for each project.',
          'A link straight to the project’s chart or design.',
        ]}
      />
    </Page>
  );
}

export function NotFoundPage() {
  return (
    <Page title="Page not found" lead="There's nothing at this address.">
      <p>
        <a className="btn" href={tabHref('charts')}>
          Go to Charts
        </a>
      </p>
    </Page>
  );
}
