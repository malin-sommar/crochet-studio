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
8. **Backups:** export and import of everything as one file (JSON plus images in a zip). *The JSON backup is done (Phase 1); the zip with images comes with portfolio photos in Phase 5.*
9. **Phone install:** works as an installable app (PWA) and offline. *Basic install and offline use are done (Phase 1).*
10. **Later:** sync between devices (needs a backend: Azure Static Web Apps with an API, or Supabase).

## Decisions (agreed 2026-11-20)
- **Who and where:** one user, on a Windows PC and an Android phone (Chrome). No iPhone support needed. The code is public on GitHub.
- **Stack:** Vite + React + TypeScript, client-side only. Dexie over IndexedDB for storage. Plain CSS with color variables, no UI framework. Routing is the URL hash (`#/charts`) with no router library.
- **PWA:** vite-plugin-pwa (build-time only), in Phase 1. Updates wait for a tap on "Update now" so the app never reloads mid-row.
- **Hosting:** GitHub Pages, deployed by GitHub Actions on every push to `main` after the tests pass. Address: https://malin-sommar.github.io/crochet-studio/. Use that address on both devices; `localhost` is for development and has its own separate data.
- **Sync:** not now. Backup export and import is enough. Moving between devices = save a backup, put it on Google Drive (or email it), import it on the other device. Every record has `id`, `updatedAt` and `deletedAt`, so a real sync can be added later without a migration.
- **Language:** English UI. Stitch names are shown in US terms first, with a setting to switch to UK or Swedish. The other names are shown next to them, and Swedish terms are in the library for looking up.
- **Tests:** Vitest (with fake-indexeddb) for logic, plus Vitest browser mode (Chromium) for anything that needs real image decoding, canvas or pdf.js. Playwright with Chromium only, at desktop size and a 390 px Android phone (no WebKit, since there's no iPhone).
- **Drawing and PDFs (unchanged):** canvas for charts and fabric previews; SVG for stitch diagrams. pdf.js and pdf-lib, from npm and loaded only when needed.

### Phase 2 decisions (agreed 2026-11-20)
- **Moving tracker charts:** one project file per chart, downloaded from the tracker and opened here (Charts → Open project file, or Settings → Import). The tracker itself is not changed.
- **Example chart:** a "Try an example" button on the empty chart list, instead of a chart created on first visit.
- **Keep the screen on** in crochet mode (Wake Lock) is part of Phase 2, with a switch to turn it off.
- **Project files** are written in the tracker's format (`{app:"tapestry-chart-tracker", version:2, project}`), so they open in both apps.
- **Test PDFs:** the repository is public, so real (bought) patterns never go in it. Tests use a generated Stitch Fiddle look-alike. Real PDFs can go in `tests/fixtures/private/` (git-ignored), where `npm test` checks that their numbers are read.
- **The tracker's "later" ideas** (carry hints, lone stitches, yarn per color) wait until after the port.

### Phase 3 decisions (agreed 2026-11-20)
- **First 16 stitches:** ch, sl st, sc, hdc, dc, tr · magic ring, front/back loop only · increase, sc2tog, invisible decrease · moss (linen), V-stitch, shell, puff, bobble. Next: popcorn, cluster, front/back post, crocodile, waffle, granny cluster.
- **Text** is written fresh by Claude; the user corrects anything that doesn't match their own way of crocheting. Each stitch also has "My notes" (own words plus a favorite video link), saved and backed up.
- **Abbreviations in instructions follow the terms setting** (US sc / UK dc / Swedish fm), with the English sentences unchanged and a key on each page.
- **Videos:** a "Find a video" button opens a YouTube search, instead of fixed links that can go stale.
- **Pictures:** drawn swatches now. Crochet chart symbols come later.
- **"Use in designer"** comes with Phase 4. The stitch data already holds what the designer needs.
- **Abbreviations list** (idea #6) is part of the Stitches tab.
- **Swedish terms** not confirmed yet show a "please check" mark until the user confirms them.

## Phases
1. ✅ App shell: tabs, routing, theme (light and dark), storage layer, export/import of everything. Also PWA install and offline, and GitHub Pages deploy.
2. ✅ Port the tapestry and mosaic tracker with all features and tests. Import existing project files.
3. ✅ Stitch library (start with about 15 stitches, then grow it).
4. Scarf and blanket maker: create mode, preview, crochet mode, yarn estimate.
5. Portfolio with photos.
6. Extras from the ideas list, one at a time.

## What's built

### Phase 1: app shell (2026-11-20)
- **Tabs:** Charts, Stitches, Designer, Portfolio and Settings. There's a bottom tab bar on a phone and a side bar from 768 px. Placeholder pages say what each phase brings. An empty address opens the last main tab used on this device; an unknown address shows "Page not found".
- **Theme:** Automatic (follows the device), Light or Dark, chosen per device (localStorage `cs-theme`). An inline script in `index.html` applies it before the first paint. Colors are CSS variables in `src/styles.css`; dark values are under `[data-theme='dark']`.
- **Storage** (`src/storage/`):
  - IndexedDB database `crochet-studio` with the stores `settings` (one `prefs` record: stitch terms), `charts`, `designs` and `portfolio`. The content stores are empty until their phases define a record shape.
  - Every record has `id` (UUID), `createdAt`, `updatedAt` (always moves forward, even if the clock goes back) and `deletedAt` (set when trashed). Helpers live in `content.ts`: create, update, move to Trash, restore, delete for good (Trash only), empty the Trash, count.
  - Per-device conveniences are kept in localStorage with a `cs-` prefix and are not backed up: theme, last tab, last backup date.
  - The app asks the browser for persistent storage at start-up and after install. Settings shows the status and the space used.
- **Backups** (`backup.ts`): `{app:"crochet-studio", format:1, exportedAt, appVersion, stores:{settings, charts, designs, portfolio}}`, including trashed items.
  - Import reads and checks the file, shows a preview (new / updated / unchanged per store), then merges in one transaction. The newest `updatedAt` wins, and import never deletes anything.
  - It refuses, with a plain message: files that aren't backups, tracker project files, newer formats, and stores it doesn't know (so data is never silently dropped).
  - A banner reminds you to back up when there's work on the device and no backup in 14 days.
- **Settings page:** theme, terms, backup and import (with "how to move to another device"), storage protection and an Install button, Trash (restore / delete for good / empty, with confirmation), and the app version.
- **Tests:** 61 unit tests (storage, Trash, merge rules, backup round trip, moving back and forth between two devices, damaged files, a test that every database version upgrades, a test that every backup format still imports, routing, theme, dates). 20 Playwright tests: each tab at desktop and phone size, no sideways scrolling, tap-target size, theme and terms saved across reloads, backup saved on one browser and imported in a fresh one, a tracker file refused, the install manifest.
- **Not covered by browser tests yet:** the Trash and the backup reminder in the UI (nothing can create content until Phase 2; their logic is unit-tested), and the service worker (blocked in tests to avoid stale caches).

### Phase 2: tapestry and mosaic charts (2026-11-20)
- **Pages** (`src/charts/ui/`, routed from `src/pages/ChartsPage.tsx`):
  - `#/charts` lists the charts with a thumbnail, size, technique and progress. Buttons: New chart, Import picture or PDF, Open project file, Paste chart code. When the list is empty there's a "Try an example" button.
  - `#/charts/<id>` is edit mode: Paint/Scroll, Undo (60 steps, per session), color picker, zoom, mosaic check, reversible back preview. Then cards for colors (names, shades, stitch counts, add/remove), size and shape (resize, 3-stitch border, mirror, flip), technique (tapestry/mosaic, reversible, row 1 color) and "This chart" (rename, Download PDF, Download project file, Duplicate, chart code, Delete to the Trash).
  - `#/charts/<id>/crochet` is crochet mode: the current row in big type with its color blocks in working order, direction and colors, the chart scrolled to the row (tap a row to jump), all rows with done ticks, how to work it, keep the screen on, clear progress. On a phone the tab bar is hidden and the Previous / "Done, next row" buttons sit at the bottom. Backup banners are hidden here.
  - `#/charts/import` imports a picture or PDF: drag to select the chart area, correct squares across/down, choose the number of colors, name it, create.
- **Logic** (`src/charts/`, no browser needed except where noted):
  - `model.ts`: the chart type, strict reading of tracker files and chart codes (including the oldest formats), project files.
  - `edit.ts`: drawing, resize, border, mirror, flip, colors, progress.
  - `rows.ts`: tapestry rows in working order.
  - `mosaic.ts`: overlay mosaic stitches, rule check, back preview.
  - `importImage.ts`: grid detection and color grouping.
  - `pdfLabels.ts`: reading the grid from printed row and column numbers.
  - `pdfExport.ts`: PDF export.
  - `importBrowser.ts` and `importPdf.ts` (browser only): picture decoding and pdf.js.
  - `store.ts`: saving charts.
  - `view.ts`: per-device zoom, tool and color.
- **Saving:** a chart record is the tracker's project fields (`name, w, h, cells, pal, tech, rev, mfirst, cur, done`) plus the shared record fields. Progress travels with backups; zoom, tool and the paint color are per device (localStorage `cs-chart-views`). Changes save 0.4 s after the last edit, and at once when the app is hidden, closed or the chart is left. A record that can't be read is hidden from the list but never deleted. No database or backup format change was needed (still version 1 / format 1).
- **Offline:** pdf.js, its worker and pdf-lib load only when used, and are cached by the service worker (about 2.5 MB cached in total).
- **Tests:** 243 Vitest tests (in Node and in Chromium; one more is skipped until a private PDF is added) and 42 Playwright tests in total. They cover:
  - The tracker's test list: 1:1 pixel art, scaled pixel art, chart screenshots with grid lines including JPEG, a Stitch Fiddle-style PDF with row numbers split between both sides, and 40 random mosaic round trips.
  - Plus: old tracker files, chart codes, editing, rows, PDF export, a 20-file JPEG sweep, and end-to-end paint/undo, crochet progress across reloads, tracker files, paste, downloads, Trash, picture and PDF import, and backups that carry charts.

### Phase 3: stitch library (2026-11-20)
- **Pages** (`src/stitches/ui/`, routed from `src/pages/StitchesPage.tsx`):
  - `#/stitches` is the list: a "Names in US / UK / Swedish" switch (the same setting as in Settings), search, filter chips for type and difficulty, and cards with a swatch, names in all three systems, badges and a "My notes" mark. A search that matched another system's name says so ("Found by the UK name: Double crochet").
  - `#/stitches/<id>` is one stitch:
    - names in US, UK and Swedish, difficulty, type and what it's used for
    - a large swatch in a choice of 5 yarn colors (remembered per device)
    - numbered steps, with a key of the abbreviations used in your terms
    - the pattern: starting chain ("Chain a multiple of 6, plus 2"), numbered rows and which rows repeat
    - tips, related stitches, "Find a video" (YouTube search in your terms) and My notes
  - `#/stitches/terms` lists abbreviations in US ↔ UK ↔ Swedish, with search.
- **Logic** (`src/stitches/`):
  - `terms.ts`: the US/UK/Swedish words and `renderTerms`, which turns `{sc}`-style tokens into the chosen terms and capitalises sentences.
  - `data.ts`: the 16 stitches.
  - `model.ts`: the stitch and pattern types, starting-chain text, the `chainFits` check and row numbering.
  - `search.ts`: search across all three systems and keywords, accents ignored, your own terms ranked first.
  - `swatch.ts`: the swatch drawer.
  - `notes.ts`: My notes.
- **Data for the designer:** each fabric-making stitch has `pattern.multiple` and `pattern.plus` (the chain rule), the setup and repeat rows, `rowHeight` (compared with sc) and `yarn` (rough use per stitch width, compared with sc). Both numbers are estimates to be tuned against real swatches in Phase 4.
- **Swatch drawer:** pure geometry, returning a list of shapes (ellipses, paths, rotated groups) that `SwatchView` paints as SVG. Phase 4 can paint the same shapes on a canvas.
  - A swatch is rows of items: stitches, fans (inc, V, shell), joins (decreases), chain arcs and spaces.
  - Every stitch is drawn as a post from its base to its top, so fans spread and decreases lean in.
  - Repeating rows keep each group over its own base.
- **Saving:** database version 2 adds the `stitchNotes` store (record id = stitch id), included in backups. It has an upgrade fixture and test, and old backups still import. Backup format is still 1.
- **Tests:** 302 Vitest tests and 60 Playwright tests in total. New for Phase 3:
  - Unit tests check that every stitch has complete names, text and links, and that every `{token}` is a known term.
  - Every swatch must draw without NaN, a fan must spread from one point, and drawings must be deterministic.
  - Also covered: chain rules, rendering in all three systems, search (Swedish, accents, "double crochet" in both systems, filters), notes and backups.
  - 18 Playwright tests cover the list, search, filters, UK terms everywhere, the stitch page, notes across reloads and the abbreviations list.
- **Shared styles** (form fields, hints, back link, color buttons) moved from `charts.css` into `styles.css`.

### Changes to the plan
- PWA install and offline use moved from "more ideas" into Phase 1, since the phone is a main device.
- Sharing a backup straight to Drive with the Android share sheet isn't possible: Chrome won't share `.json` files. The backup is a normal download instead.
- Phase 2 import is more reliable than the tracker's. Each fix has its own tests:
  - Scaled pixel art wider than 200 px could be read as 2 or 3 squares per square.
  - JPEG ringing could be taken for grid lines.
  - pdf.js joins closely spaced column numbers ("9 10 11 12") into one piece of text; these are now split again.
- Settings → Import now opens a tracker project file as a new chart instead of refusing it.
- The first backup reminder waits until there's work at least 2 days old, so it doesn't appear right after the first chart.
- Phase 3: the Stitches tab gained a "type" the plan didn't name, Technique (magic ring, front/back loop only), next to Basic, Increase & decrease and Texture.
- "Update now" saves pending changes first and reloads by itself if the normal hand-over doesn't (fixed after Phase 2 went live).

## Working agreements for Claude
- Read this file and `../tapestry-tracker/CLAUDE.md` before changing anything.
- Never lose user data: migrations must keep old saved data readable, and any change to the storage format needs a migration and a test. Concretely:
  - **Database:** `SCHEMA_HISTORY` in `src/storage/db.ts` is append-only. A new version gets an `upgrade` when records change shape, plus an entry in `tests/fixtures/db-fixtures.ts` (the upgrade test fails without one). Adding a store or an index needs a new version but no data migration.
  - **Backup format:** when existing records change shape, raise `BACKUP_FORMAT`, add a migration in `backup.ts` and add `tests/fixtures/backup-format-<n>.json`. Never edit an old fixture. A new store doesn't need a format change, but add it to `BACKUP_STORES`.
  - New content stores go into `CONTENT_STORES` (to get the Trash, backup and counting) and `STORE_LABELS`.
  - Deleting means moving to the Trash. Only the Trash's "delete for good" removes data.
- Keep the UI usable at phone width (about 390 px). Tap targets are at least 48 px (`--tap`).
- Ask before adding a large dependency or changing the tech stack.
- Stitch descriptions and pictures are original. Don't copy text or images from tutorial sites or paid patterns, and never bake a purchased pattern into the app's code or sample data.
- Never commit real patterns. Generated test pictures and PDFs live in `tests/support/`; real ones only in the git-ignored `tests/fixtures/private/`.
- Any change to grid detection must keep every test in `tests/unit/charts-import-image.test.ts` and `tests/browser/` passing. The sweeps there exist because single examples kept hiding problems.
- Run `npm run test:all` before committing. CI runs the same checks and blocks the deploy if they fail.
- After each phase, update this file: what was built, what changed in the plan, open questions.

## Open questions
- App name: "Crochet Studio" for now. It appears in `vite.config.ts` (manifest), `index.html` and the brand in `TabNav.tsx`.
- PDF import is only tested against a generated look-alike of a Stitch Fiddle PDF. A real one (in `tests/fixtures/private/`) would confirm it, since real PDFs may space or rotate their numbers differently.
- Two very similar colors (for example navy and dark green) in a JPEG can merge when the number of colors is Automatic. Choosing the number fixes it. Is that good enough, or should Automatic be smarter?
- Not yet tried on a real Android phone: painting with a finger, keep-screen-on, install, and the bottom buttons in crochet mode.
- Swedish terms marked "please check" in the app (`checked: false` in `src/stitches/terms.ts` and `data.ts`):
  - stitches: mosstygn, V-maska, solfjäder, puffmaska, knopp, 2 fm tillsammans, osynlig minskning
  - other words: båge, luftmaskbåge, tillsammans, virkfasthet, "klipp av och fäst tråden", reliefstolpe framifrån/bakifrån, kluster
- The step text for the 16 stitches needs a read-through by someone who crochets, to match "in my own words".
- Swatch drawings are stylized. Shell is the least faithful (airier than real shell fabric).
