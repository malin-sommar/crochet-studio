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
