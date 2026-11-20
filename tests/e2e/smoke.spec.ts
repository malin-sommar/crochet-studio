import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const TABS = [
  { label: 'Charts', hash: '#/charts', heading: 'Charts' },
  { label: 'Stitches', hash: '#/stitches', heading: 'Stitches' },
  { label: 'Designer', hash: '#/designer', heading: 'Scarf & blanket maker' },
  { label: 'Portfolio', hash: '#/portfolio', heading: 'Portfolio' },
  { label: 'Settings', hash: '#/settings', heading: 'Settings' },
];

async function expectNoSidewaysScroll(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(scroll, 'page is wider than the screen').toBeLessThanOrEqual(width);
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Sections' });

test('opens on Charts the first time', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/#\/charts$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Charts' })).toBeVisible();
});

test('every tab opens from the tab bar and fits the screen', async ({ page }) => {
  await page.goto('/');
  for (const tab of TABS) {
    await nav(page).getByRole('link', { name: tab.label }).click();
    await expect(page).toHaveURL(new RegExp(`${tab.hash}$`));
    await expect(page.getByRole('heading', { level: 1, name: tab.heading })).toBeVisible();
    await expect(nav(page).getByRole('link', { name: tab.label })).toHaveAttribute('aria-current', 'page');
    await expectNoSidewaysScroll(page);
  }
});

test('tab bar buttons are big enough to tap', async ({ page }) => {
  await page.goto('/');
  for (const tab of TABS) {
    const box = await nav(page).getByRole('link', { name: tab.label }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
});

test('reopens the last tab used', async ({ page }) => {
  await page.goto('/#/designer');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Scarf & blanket maker');
  await page.goto('/');
  await expect(page).toHaveURL(/#\/designer$/);
});

test('an unknown address shows "Page not found" with a way back', async ({ page }) => {
  await page.goto('/#/nothing-here');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to Charts' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Charts' })).toBeVisible();
});

test('the theme follows the device, and a chosen theme is remembered', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#/settings');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.getByText('Light', { exact: true }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('radio', { name: 'Light' })).toBeChecked();

  await page.getByText('Automatic', { exact: true }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html).toHaveAttribute('data-theme', 'light');
});

test('the terms choice is saved', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByRole('radio', { name: 'US' })).toBeChecked();
  await page.getByText('Swedish', { exact: true }).click();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Swedish' })).toBeChecked();
});

test('a backup saved on one device can be imported on another', async ({ page, browser }, testInfo) => {
  // Device A: choose UK terms, then save a backup
  await page.goto('/#/settings');
  await page.getByText('UK', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'UK' })).toBeChecked();

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup file' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^crochet-studio-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(file);
  const backup = JSON.parse(readFileSync(file, 'utf8'));
  expect(backup).toMatchObject({ app: 'crochet-studio', format: 1 });
  await expect(page.getByText(/Last backup from this device: today/)).toBeVisible();

  // Device B: a fresh browser with no saved data
  const other = await browser.newContext();
  const pageB = await other.newPage();
  await pageB.goto('/#/settings');
  await expect(pageB.getByRole('radio', { name: 'US' })).toBeChecked();

  await pageB.getByTestId('import-file').setInputFiles(file);
  const preview = pageB.getByRole('region', { name: 'Import preview' });
  await expect(preview).toContainText('Settings: 1 new');
  await preview.getByRole('button', { name: 'Import' }).click();
  await expect(pageB.getByText('Imported: 1 new and 0 updated.')).toBeVisible();
  await expect(pageB.getByRole('radio', { name: 'UK' })).toBeChecked();

  // Importing the same file again changes nothing
  await pageB.getByRole('button', { name: 'OK' }).click();
  await pageB.getByTestId('import-file').setInputFiles(file);
  await expect(pageB.getByText('There is nothing to import.')).toBeVisible();
  await other.close();
});

test('a file that is not a backup is refused with a clear message', async ({ page }, testInfo) => {
  const file = testInfo.outputPath('heart.json');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(file, JSON.stringify({ app: 'tapestry-chart-tracker', version: 2, project: {} }));
  await page.goto('/#/settings');
  await page.getByTestId('import-file').setInputFiles(file);
  await expect(page.getByRole('alert')).toContainText('Tapestry Chart Tracker');
});

test('the app can be installed (it has a manifest with icons)', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(new URL(href!, page.url()).href)).json();
  expect(manifest).toMatchObject({ name: 'Crochet Studio', display: 'standalone' });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
});
