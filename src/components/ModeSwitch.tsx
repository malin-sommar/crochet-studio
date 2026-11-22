/** "Edit | Crochet" switch at the top of a chart or design. */
export function ModeSwitch({ editHref, crochetHref, mode }: { editHref: string; crochetHref: string; mode: 'edit' | 'crochet' }) {
  return (
    <nav className="mode-switch" aria-label="Mode">
      <a href={editHref} aria-current={mode === 'edit' ? 'page' : undefined}>
        Edit
      </a>
      <a href={crochetHref} aria-current={mode === 'crochet' ? 'page' : undefined}>
        Crochet
      </a>
    </nav>
  );
}
