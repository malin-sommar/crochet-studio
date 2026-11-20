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
- **Tests:** Vitest (with fake-indexeddb) for logic. Playwright with Chromium only, at desktop size and a 390 px Android phone (no WebKit, since there's no iPhone).
- **Drawing and PDFs (unchanged):** canvas for charts and fabric previews; SVG for stitch diagrams. pdf.js and pdf-lib, from npm and loaded only when needed.

## Phases
1. ✅ App shell: tabs, routing, theme (light and dark), storage layer, export/import of everything. Also PWA install and offline, and GitHub Pages deploy.
2. Port the tapestry and mosaic tracker with all features and tests. Import existing project files.
3. Stitch library (start with about 15 stitches, then grow it).
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

### Changes to the plan
- PWA install and offline use moved from "more ideas" into Phase 1, since the phone is a main device.
- Sharing a backup straight to Drive with the Android share sheet isn't possible: Chrome won't share `.json` files. The backup is a normal download instead.

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
- Run `npm run test:all` before committing. CI runs the same checks and blocks the deploy if they fail.
- After each phase, update this file: what was built, what changed in the plan, open questions.

## Open questions
- App name: "Crochet Studio" for now. It appears in `vite.config.ts` (manifest), `index.html` and the brand in `TabNav.tsx`.
- Phase 2: the existing tracker projects live inside the claude.ai artifact (its localStorage and account database), which this app can't read. Should the tracker get an "Export all projects" button, so moving them is one file instead of one file per chart?
- Phase 2: what should a chart record look like in the `charts` store? Proposal: the tracker's project fields (`name, w, h, cells, pal, active, cur, done, tech, rev, mfirst`) plus the shared record fields, with the tracker's `normalize` rules for reading old files.
