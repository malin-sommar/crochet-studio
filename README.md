# Crochet Studio

A personal web app for crocheting: tapestry and mosaic charts, a stitch library, a scarf and blanket maker, and a portfolio. It works on a computer and on an Android phone, offline, and can be installed like an app.

**Status:** Phase 1 (app shell, storage and backups) and Phase 2 (tapestry and mosaic charts, ported from the Tapestry Chart Tracker) are done. The other tabs show what's coming. See [CLAUDE.md](CLAUDE.md) for the full plan.

## Moving charts from the Tapestry Chart Tracker

In the tracker, open each chart and use **Download project file**. Then, in Crochet Studio, go to **Charts → Open project file** (or **Settings → Import a backup**) and pick the file. Each file becomes a chart here with its colors, mosaic settings and crochet progress.

## Use it

Once GitHub Pages is turned on (see [Publishing](#publishing)), the app lives at
**https://malin-sommar.github.io/crochet-studio/**. Use that address on both the computer and the phone.

On Android, open it in Chrome, then use **Settings → Install Crochet Studio on this device** (or Chrome's menu → *Add to Home screen*). Installed, it opens from the home screen, works offline, and the browser is more likely to protect its saved data.

## Your data

- Everything is saved automatically in the browser on each device (IndexedDB). Nothing is sent anywhere.
- Each device and each web address has its own separate data. The app at `localhost` is for development; use the GitHub Pages address for real work.
- **Settings → Save backup file** saves everything as one `.json` file. **Import a backup** merges a file into this device: for each item the newest version wins, and nothing is ever deleted. That's also how you move work between the computer and the phone (for example through Google Drive).
- Deleted items go to the Trash first and can be restored from Settings.

## Run it on your computer

Needs [Node.js](https://nodejs.org) 20 or newer.

```
npm install
npm run dev
```

Then open http://localhost:5173.

## Tests

```
npm test              # Vitest: logic in Node, plus picture and PDF import in a real Chromium
npm run test:e2e      # Playwright: the whole app on a desktop and a 390 px phone screen
npm run check         # TypeScript type check
npm run test:all      # all of the above
```

The first time, download the test browser with `npx playwright install chromium`.

Real chart PDFs (for example bought patterns) must never be committed. To test with them anyway, put them in `tests/fixtures/private/`: git ignores that folder, and `npm test` checks that their row and column numbers are read.

## Publishing

Every push to `main` runs the tests and, if they pass, publishes the app to GitHub Pages (`.github/workflows/deploy.yml`).

One-time setup: on GitHub, open the repository's **Settings → Pages** and set **Source** to **GitHub Actions**.

## Project layout

```
src/
  App.tsx              tabs and routing
  router.ts            addresses like #/charts
  theme.ts             light, dark or automatic (per device)
  pwa.ts               offline copy, updates, install button
  pages/               one file per tab, plus Settings
  components/          tab bar, page frame, buttons, banners, icons
  charts/              tapestry and mosaic charts
    model.ts           what a chart is; tracker files and chart codes
    edit.ts            drawing, resize, border, mirror, flip, colors, progress
    rows.ts, mosaic.ts row instructions; mosaic stitches and rule check
    importImage.ts     finding the grid in a picture and grouping colors
    pdfLabels.ts       reading the grid from a PDF's row and column numbers
    importPdf.ts       pdf.js (loaded only for PDFs)
    pdfExport.ts       the chart as a PDF (pdf-lib, loaded only when used)
    store.ts, view.ts  saving charts; per-device zoom and tool
    ui/                chart list, editor, crochet mode, import
  storage/
    db.ts              the database and its version history
    records.ts         fields every saved item has (id, createdAt, updatedAt, deletedAt)
    content.ts         save, trash, restore, delete for good
    prefs.ts           preferences that travel with backups (stitch terms)
    device.ts          per-device conveniences (theme, last tab, last backup date)
    backup.ts          backup file format, reading, merging and importing
    persist.ts         asking the browser to protect saved data
tests/
  unit/                Vitest in Node
  browser/             Vitest in Chromium (picture decoding, pdf.js)
  e2e/                 Playwright
  support/             generated test pictures and PDFs
  fixtures/            saved data from every database version and backup format, tracker files
public/                app icons (PNGs are made from the SVGs with `npm run icons`)
```
