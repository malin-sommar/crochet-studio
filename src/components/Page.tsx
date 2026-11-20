import { useEffect, useRef, type ReactNode } from 'react';

/** A page with its heading. The heading takes focus on arrival, so screen readers announce it. */
export function Page({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${title} · Crochet Studio`;
    h1.current?.focus({ preventScroll: true });
  }, [title]);

  return (
    <article className="page">
      <header className="page-head">
        <h1 ref={h1} tabIndex={-1}>
          {title}
        </h1>
        {lead && <p className="lead">{lead}</p>}
      </header>
      {children}
    </article>
  );
}

export function Card({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section className="card" aria-labelledby={id ? `${id}-title` : undefined}>
      <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
      {children}
    </section>
  );
}
