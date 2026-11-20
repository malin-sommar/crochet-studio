# Crochet Studio

A personal web app for crocheting: tapestry and mosaic charts, a stitch library, a scarf and blanket maker, and a portfolio. It works on a computer and on an Android phone, offline, and can be installed like an app.

**Status:** Phase 1 (app shell, storage and backups) is done. The tabs show what's coming in each phase. See [CLAUDE.md](CLAUDE.md) for the full plan.

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
npm test              # unit tests (Vitest): storage, backups, migrations, routing
npm run test:e2e      # browser tests (Playwright) on a desktop and a 390 px phone screen
npm run check         # TypeScript type check
npm run test:all      # all of the above
```

The first time, download the test browser with `npx playwright install chromium`.

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
  storage/
    db.ts              the database and its version history
    records.ts         fields every saved item has (id, createdAt, updatedAt, deletedAt)
    content.ts         save, trash, restore, delete for good
    prefs.ts           preferences that travel with backups (stitch terms)
    device.ts          per-device conveniences (theme, last tab, last backup date)
    backup.ts          backup file format, reading, merging and importing
    persist.ts         asking the browser to protect saved data
tests/
  unit/                Vitest
  e2e/                 Playwright
  fixtures/            saved data from every database version and backup format
public/                app icons (PNGs are made from the SVGs with `npm run icons`)
```
