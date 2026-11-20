import type { ChartContent } from '../model';

/** How to work the chart, for tapestry or overlay mosaic. */
export function HowTo({ chart }: { chart: ChartContent }) {
  if (chart.tech === 'mosaic') {
    return (
      <ol className="howto">
        <li>
          <b>One color per row,</b> alternating A and B. The card shows each row's color. Nothing is carried.
        </li>
        <li>
          <b>Always work with the front facing you,</b> right to left, and cut the yarn at the end of every row.
          Start each new row at the right edge again. Leave tails of about 10 cm: they become a fringe or get hidden
          under a border.
        </li>
        <li>
          <b>Row 1:</b> chain (width + 1), then sc in the 2nd chain from the hook and across. <b>Row 2:</b> sc in the
          back loop of every stitch.
        </li>
        <li>
          <b>sc</b> = single crochet in the back loop only.
        </li>
        <li>
          <b>X</b> = double crochet in the front loop of the stitch two rows below (it's the same color as the row
          you're working). It lies over the stitch of the row below and covers it. Skip the stitch behind it.
        </li>
        {chart.rev && (
          <li>
            <b>A</b> = anchored double crochet, worked where a stitch sits right above an X: insert the hook in the
            back loop of the current stitch, tip the work toward you and also insert it in the back loop of the stitch
            two rows below, then yarn over, pull through one loop, and finish like a dc. From the front it looks like an
            sc; on the back it places the design in swapped colors.
          </li>
        )}
        <li>
          <b>Edges:</b> the first and last stitch of every row are sc, so keep the outermost columns plain in your
          design.
        </li>
        {chart.rev && (
          <li>
            <b>Reversible finish:</b> methods differ on the last rows; many add one or two extra rows and an envelope
            border so the back's top edge is finished too.
          </li>
        )}
      </ol>
    );
  }
  return (
    <ol className="howto">
      <li>
        <b>Foundation:</b> chain (width + 1) in the color of the first stitch. Row 1 starts with an sc in the 2nd chain
        from the hook. The ch 1 at the start of each later row doesn't count.
      </li>
      <li>
        <b>Direction:</b> odd rows run right to left across the chart, even rows left to right. The counts are already
        in working order.
      </li>
      <li>
        <b>Color change:</b> on the last stitch before the new color, do the final yarn over with the new color.
      </li>
      <li>
        <b>Carrying:</b> lay every color you're not using along the top of the row and sc over them. With 3 or more
        colors that's two or more strands at once, so keep them flat side by side and your tension snug.
      </li>
      <li>
        <b>Colors missing from a stretch of rows:</b> if a color isn't used for many rows, you can cut it and rejoin it
        later instead of carrying it. "Colors in this row" shows what each row needs.
      </li>
      <li>
        <b>Count</b> each row before moving on. Every row adds up to the chart width.
      </li>
    </ol>
  );
}
