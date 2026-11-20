import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A page with its heading. The heading takes focus when the page opens, so screen readers
 * announce it. (Only on opening: renaming a chart must not pull focus out of the name field.)
 */
export function Page({
  title,
  lead,
  back,
  children,
}: {
  title: string;
  lead?: ReactNode;
  back?: { href: string; label: string };
  children?: ReactNode;
}) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    h1.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    document.title = `${title} · Crochet Studio`;
  }, [title]);

  return (
    <article className="page">
      <header className="page-head">
        {back && (
          <a className="back-link" href={back.href}>
            ← {back.label}
          </a>
        )}
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
