# Crochet Studio

A personal web app for crocheting: planning, charting, following patterns row by row, learning stitches and keeping a portfolio of finished work. Built for one user (me), used on both desktop and phone, often with yarn in my hands.

## Goals
- One app with tabs instead of separate tools.
- Works well on a phone held next to my work: big buttons, readable at arm's length, the screen stays on while crocheting.
- My data is never lost: everything saves automatically, and I can export a full backup.
- Plain-language UI. No jargon without an explanation.

## Tabs

### 1. Tapestry & mosaic charts (port of the existing tracker)
Source: `../tapestry-tracker/` (`tracker.html`, plus its README.md and CLAUDE.md). Read those first.
- Keep every existing feature. The look may change to fit the app.
- Features to keep: projects (new, duplicate, rename, delete); drawing with up to 8 colors; palette with names, colors and stitch counts; resize; 3-stitch border; mirror and flip; undo; import from image (grid detection, color grouping) and from PDF (pdf.js, reads row and column numbers); tapestry row instructions in working order (odd rows right to left); overlay mosaic mode with rule checking, X and anchored stitches, a reversible back preview and a choice of row 1 color; crochet mode with a current row, next/previous buttons and done rows; PDF export (pdf-lib); project file (.json) export and import; chart code paste.
- Open existing project files from the tracker (`{app:"tapestry-chart-tracker", version:2, project}`) without changes.
- Port the logic into separate, testable modules (grid detection, color quantization, row instructions, mosaic rules, PDF import/export) rather than one big file.
- Tests to carry over: 1:1 pixel art, scaled pixel art, chart screenshots with grid lines (including JPEG), a Stitch Fiddle PDF with row labels split between both sides, and mosaic round trips (random legal stitch layout, then picture, then the same stitches back).
- Later ideas: "where to carry each color" hints per row (first and last use of each color); simplifying lone single stitches; a yarn estimate per color.

### 2. Stitch library
- A browsable list of stitches: basics (ch, sl st, sc, hdc, dc, tr), variations (BLO/FLO, sc2tog, inc, invisible decrease, magic ring), and textures (moss/linen, V-stitch, shell, puff, bobble, popcorn, cluster, front/back post, crocodile, waffle, granny cluster).
- Each stitch: its name in US terms, the UK term and the Swedish term; what it's used for; difficulty; step-by-step instructions in my own words; an illustrated preview of what a small swatch looks like; and the related stitches.
- Previews are drawn by the app (SVG or canvas), not copied images. Descriptions are written fresh, not copied from tutorial sites. Optional links out to video tutorials.
- Search and filter (difficulty, type: basic, texture, increase/decrease).
- "Use in designer": add the stitch to a row in the scarf/blanket maker.

### 3. Scarf & blanket maker
- **Create mode:** build a piece from rows. Each row has a stitch pattern (from the library), a color and a loop (both, BLO, FLO). Rows can repeat ("rows 3–6 × 10"). Set the width in stitches or cm, and let the app check that the stitch count fits the pattern's multiple (for example, moss stitch needs an even number of chains).
- **Preview:** a drawn picture of the whole piece and a close-up of a few rows, updated live. Show the size in cm from a gauge (my swatch: stitches and rows per 10 cm).
- **Yarn estimate:** meters per color, and the number of balls from the yarn's meters per ball.
- **Crochet mode:** like the tapestry tracker: the current row with plain instructions ("Row 12 · Mustard · moss stitch: ch 2, sc in each ch-1 space…"), a stitch count, Next/Previous, and progress saved.
- Saved as projects, like the charts.

### 4. Portfolio
- Entries for started and finished projects: title, photos (several, with a cover photo), description, pattern used (a link or a project in the app), yarn, hook, dates started and finished, time spent, recipient ("gift for…"), and notes on what I learned.
- Status: planned / in progress / finished / frogged.
- Gallery view and a single-project page. Photos are resized before saving.
- Link a portfolio entry to its chart or designer project so I can jump straight to the instructions.

## More ideas (in priority order)
1. **Row counter and timer:** a big tap-to-count counter with a stitch counter too, available from any tab. Track time spent per project.
2. **Keep screen on:** the Wake Lock API in crochet modes, with a large "next row" button usable with one finger.
3. **Yarn stash:** the yarn I own (brand, fiber, weight, meters per ball, color, amount, dye lot, where bought, price) and my hooks. Projects can reserve yarn from the stash, and a shopping list shows what's missing.
4. **Calculators:** gauge (swatch → stitches and rows for a target size), yarn needed for an area, how many balls, adjusting a pattern to a different yarn weight.
5. **Contrast checker:** shows any palette in grayscale, so colors that blend together are obvious before buying yarn.
6. **Abbreviations and terms:** US ↔ UK ↔ Swedish, quick to search.
7. **Pattern library:** save bought PDFs and links with notes and my progress in them.
8. **Backups:** export and import of everything as one file (JSON plus images in a zip).
9. **Phone install:** works as an installable app (PWA) and offline.
10. **Later:** sync between devices (needs a backend: Azure Static Web Apps with an API, or Supabase).

## Tech direction (proposal; confirm before building)
- Vite + React + TypeScript, client-side only at first. A PWA for install and offline use.
- Storage: IndexedDB (for example through Dexie) for projects, stash and portfolio photos. Every store gets export and import.
- Drawing: canvas for charts and fabric previews; SVG for stitch diagrams.
- Libraries: pdf.js (PDF import) and pdf-lib (PDF export), as in the tracker.
- Tests: Vitest for the logic modules; Playwright for a smoke test of each tab, at desktop and phone width.
- Hosting: start with local `npm run dev`; later a static host (GitHub Pages or Azure Static Web Apps).
- The old tracker's account sync used claude.ai artifact features, which won't exist in this app. Local storage plus export/import replaces it until a real sync backend exists.

## Phases
1. App shell: tabs, routing, theme (light and dark), storage layer, export/import of everything.
2. Port the tapestry and mosaic tracker with all features and tests. Import existing project files.
3. Stitch library (start with about 15 stitches, then grow it).
4. Scarf and blanket maker: create mode, preview, crochet mode, yarn estimate.
5. Portfolio with photos.
6. Extras from the ideas list, one at a time.

## Working agreements for Claude
- Read this file and `../tapestry-tracker/CLAUDE.md` before changing anything.
- Never lose user data: migrations must keep old saved data readable, and any change to the storage format needs a migration and a test.
- Keep the UI usable at phone width (about 390 px).
- Ask before adding a large dependency or changing the tech stack.
- Stitch descriptions and pictures are original. Don't copy text or images from tutorial sites or paid patterns, and never bake a purchased pattern into the app's code or sample data.
- After each phase, update this file: what was built, what changed in the plan, open questions.

## Open questions
- App name (working title: Crochet Studio).
- US or UK terms as the default (show both?).
- Is device sync needed early, or is export/import enough for now?
