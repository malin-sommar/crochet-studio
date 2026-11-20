import { expect, test, type Page } from '@playwright/test';

async function noSidewaysScroll(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(scroll, 'page is wider than the screen').toBeLessThanOrEqual(width);
}

const cards = (page: Page) => page.locator('.stitch-card');
const search = (page: Page) => page.getByRole('searchbox', { name: /Search stitches/ });

test('the library lists the 16 stitches with drawings, and fits the screen', async ({ page }) => {
  await page.goto('/#/stitches');
  await expect(page.getByRole('status').filter({ hasText: 'stitches' })).toHaveText('16 stitches');
  await expect(cards(page)).toHaveCount(16);
  await expect(cards(page).first().locator('svg')).toBeVisible();
  await noSidewaysScroll(page);
});

test('search finds a stitch by its Swedish name, and by other names', async ({ page }) => {
  await page.goto('/#/stitches');
  await search(page).fill('fast maska');
  await expect(cards(page).first()).toContainText('Single crochet (sc)');
  await search(page).fill('linen');
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText('Moss stitch');
  await search(page).fill('zzz');
  await expect(page.getByText('No stitches match “zzz”.')).toBeVisible();
  await page.getByRole('button', { name: 'Show all stitches' }).click();
  await expect(cards(page)).toHaveCount(16);
});

test('"double crochet" explains that it is the UK name of single crochet', async ({ page }) => {
  await page.goto('/#/stitches');
  await search(page).fill('double crochet');
  await expect(cards(page).first()).toContainText('Double crochet (dc)');
  await expect(page.getByText('Found by the UK name: Double crochet', { exact: true })).toBeVisible();
  // sc2tog's UK name contains the words too, so it's found as well
  await expect(page.getByText('Found by the UK name: Double crochet two together', { exact: true })).toBeVisible();
});

test('filters by type and difficulty', async ({ page }) => {
  await page.goto('/#/stitches');
  await page.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Texture' }).click();
  await expect(cards(page)).toHaveCount(5);
  await page.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: 'Intermediate' }).click();
  await expect(cards(page)).toHaveCount(2);
});

test('in UK terms, single crochet is called double crochet everywhere', async ({ page }) => {
  await page.goto('/#/stitches');
  await page.getByText('UK', { exact: true }).click();
  await expect(cards(page).nth(2)).toContainText('Double crochet (dc)');
  await cards(page).nth(2).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Double crochet (dc)' })).toBeVisible();
  await expect(page.getByText('Yrh again and pull through both loops. That is one dc.')).toBeVisible();
  await expect(page.getByText('(US: single crochet)').first()).toBeVisible();
  await expect(page.getByText('Row 1: Dc in the 2nd ch from the hook and in each ch across, turn.')).toBeVisible();
  await noSidewaysScroll(page);

  // The same setting is in Settings
  await page.goto('/#/settings');
  await expect(page.getByRole('radio', { name: 'UK' })).toBeChecked();
});

test('a stitch page has a swatch in a chosen color, a pattern and a video search', async ({ page }) => {
  await page.goto('/#/stitches/shell');
  await expect(page.getByRole('heading', { level: 1, name: 'Shell stitch' })).toBeVisible();
  const swatch = page.getByRole('img', { name: /Drawing of a small swatch of Shell stitch/ });
  await expect(swatch).toBeVisible();
  await page.getByRole('radio', { name: 'Burgundy' }).click();
  await expect(page.getByRole('radio', { name: 'Burgundy' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Chain a multiple of 6, plus 2.')).toBeVisible();
  await expect(page.getByText('Repeat rows 2–3 for the pattern.')).toBeVisible();
  const video = page.getByRole('link', { name: 'Find a video ↗' });
  await expect(video).toHaveAttribute('href', /^https:\/\/www\.youtube\.com\/results\?search_query=how%20to%20crochet%20Shell%20stitch$/);
  await expect(video).toHaveAttribute('target', '_blank');
  await page.getByRole('link', { name: /V-stitch/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'V-stitch (V-st)' })).toBeVisible();
});

test('my notes on a stitch are saved and marked in the list', async ({ page }) => {
  await page.goto('/#/stitches/moss');
  await page.getByRole('textbox', { name: 'Notes in your own words' }).fill('Change color every 2 rows');
  await page.getByRole('textbox', { name: 'A favorite video (link)' }).fill('https://example.com/moss');
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open my video ↗' })).toHaveAttribute('href', 'https://example.com/moss');

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Notes in your own words' })).toHaveValue('Change color every 2 rows');
  await page.getByRole('link', { name: '← Stitches' }).click();
  await expect(cards(page).filter({ hasText: 'Moss stitch' })).toContainText('My notes');
});

test('the abbreviations list searches US, UK and Swedish', async ({ page }) => {
  await page.goto('/#/stitches');
  await page.getByRole('link', { name: 'Abbreviations: US ↔ UK ↔ Swedish →' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Abbreviations' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search abbreviations' }).fill('yrh');
  const items = page.locator('.term-list > li');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('yarn over');
  await expect(items.first()).toContainText('omslag');
  await noSidewaysScroll(page);
});

test('an unknown stitch shows "Stitch not found" with a way back', async ({ page }) => {
  await page.goto('/#/stitches/no-such-stitch');
  await expect(page.getByRole('heading', { level: 1, name: 'Stitch not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to all stitches' }).click();
  await expect(cards(page)).toHaveCount(16);
});
