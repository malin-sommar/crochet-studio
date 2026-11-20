import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { stitchFiddleLikePdf } from '../support/pdfs';
import { TEST_COLORS, randomChart } from '../support/pictures';

const fixture = (name: string) => new URL(`../fixtures/tracker/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

async function noSidewaysScroll(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(scroll, 'page is wider than the screen').toBeLessThanOrEqual(width);
}

async function openExample(page: Page) {
  await page.goto('/#/charts');
  await page.getByRole('button', { name: 'Try an example' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Example heart' })).toBeVisible();
}

const stitchCount = (page: Page, letter: string) =>
  page.locator('.prow').filter({ has: page.getByRole('button', { name: `Paint with color ${letter}` }) }).locator('.cnt');

test('the example chart can be painted, and Undo takes it back', async ({ page }) => {
  await openExample(page);
  await noSidewaysScroll(page);
  await expect(stitchCount(page, 'A')).toHaveText('104 stitches · background');

  const canvas = page.getByRole('img', { name: /Chart, 15 by 13 squares/ });
  await canvas.click({ position: { x: 5, y: 5 } }); // top-left square, color A → B
  await expect(stitchCount(page, 'A')).toHaveText('103 stitches · background');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(stitchCount(page, 'A')).toHaveText('104 stitches · background');
});

test('crochet mode moves row by row and remembers where you are', async ({ page }, testInfo) => {
  await openExample(page);
  await page.getByRole('navigation', { name: 'Mode' }).getByRole('link', { name: 'Crochet' }).click();
  await expect(page.locator('.rownum')).toHaveText('Row 1 of 13');
  await expect(page.locator('.now .run')).toHaveText(['15 A']);

  await page.getByRole('button', { name: 'Done, next row →' }).click();
  await page.getByRole('button', { name: 'Done, next row →' }).click();
  await expect(page.locator('.rownum')).toHaveText('Row 3 of 13');
  await expect(page.locator('.now .run')).toHaveText(['6 A', '3 B', '6 A']);
  await noSidewaysScroll(page);

  if (testInfo.project.name === 'phone') {
    await expect(page.getByRole('navigation', { name: 'Sections' })).toBeHidden();
  }

  await page.waitForTimeout(600); // the save happens a moment after a change
  await page.reload();
  await expect(page.locator('.rownum')).toHaveText('Row 3 of 13');
  await expect(page.getByText('2 of 13 rows done')).toBeVisible();

  await page.getByRole('link', { name: '← Charts' }).click();
  await expect(page.getByText('Row 3 · 2 of 13 rows done')).toBeVisible();
});

test('a project file from the Tapestry Chart Tracker opens unchanged', async ({ page }) => {
  await page.goto('/#/charts');
  await page.getByTestId('open-project-file').setInputFiles(fixture('heart-project.json'));
  await expect(page.getByRole('heading', { level: 1, name: 'Heart for Mum' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Paint with color C' })).toBeVisible();
  await page.getByRole('link', { name: '← Charts' }).click();
  await expect(page.getByText('15 × 13 · Tapestry · 3 colors')).toBeVisible();
  await expect(page.getByText('Row 5 · 4 of 13 rows done')).toBeVisible();
});

test('a mosaic project shows the mosaic check and mosaic stitches', async ({ page }) => {
  await page.goto('/#/charts');
  await page.getByTestId('open-project-file').setInputFiles(fixture('mosaic-project.json'));
  await expect(page.getByRole('heading', { level: 1, name: 'Mosaic diamonds' })).toBeVisible();
  await expect(page.getByText(/Mosaic check|break the mosaic rules/)).toBeVisible();
  await expect(page.getByRole('img', { name: 'The back of the piece' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Mode' }).getByRole('link', { name: 'Crochet' }).click();
  await expect(page.getByText(/Foundation: chain 10/)).toBeVisible();
});

test('a chart code can be pasted', async ({ page }) => {
  await page.goto('/#/charts');
  await page.getByRole('button', { name: 'Paste chart code' }).click();
  await page.getByRole('textbox', { name: 'Chart code' }).fill('v2|3|2|f3ead8,8c1d3c|Cream,Red|010/101');
  await page.getByRole('button', { name: 'Open chart' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pasted chart' })).toBeVisible();
});

test('a chart downloads as a PDF and as a project file that opens again', async ({ page }, testInfo) => {
  await openExample(page);
  const pdf = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  expect((await pdf).suggestedFilename()).toBe('Example heart.pdf');

  const json = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download project file' }).click();
  const file = testInfo.outputPath('heart.json');
  await (await json).saveAs(file);
  expect(JSON.parse(readFileSync(file, 'utf8'))).toMatchObject({ app: 'tapestry-chart-tracker', version: 2 });

  await page.goto('/#/charts');
  await page.getByTestId('open-project-file').setInputFiles(file);
  await expect(page.getByRole('heading', { level: 1, name: 'Example heart' })).toBeVisible();
});

test('a deleted chart goes to the Trash and can be restored', async ({ page }) => {
  await openExample(page);
  await page.getByRole('button', { name: 'Delete chart' }).click();
  await page.getByRole('button', { name: 'Move to Trash' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'No charts yet' })).toBeVisible();

  await page.goto('/#/settings');
  const trash = page.locator('section', { has: page.getByRole('heading', { name: 'Trash' }) });
  await expect(trash.getByText('Example heart')).toBeVisible();
  await trash.getByRole('button', { name: 'Restore' }).click();
  await page.goto('/#/charts');
  await expect(page.getByRole('link', { name: 'Example heart' })).toBeVisible();
});

test('importing a picture makes a chart of the right size', async ({ page }, testInfo) => {
  const cells = randomChart(7, 40, 30, 3);
  await page.goto('/#/charts/import');
  // Draw a chart screenshot with grid lines in the browser and save it as a PNG file
  const dataUrl = await page.evaluate(
    ({ cells, colors }) => {
      const cell = 12;
      const c = document.createElement('canvas');
      c.width = cells[0]!.length * cell + 41;
      c.height = cells.length * cell + 41;
      const x = c.getContext('2d')!;
      x.fillStyle = '#fff';
      x.fillRect(0, 0, c.width, c.height);
      cells.forEach((row, r) =>
        [...row].forEach((v, q) => {
          x.fillStyle = '#8a8a8a';
          x.fillRect(20 + q * cell, 20 + r * cell, cell + 1, cell + 1);
          x.fillStyle = colors[Number(v)]!;
          x.fillRect(21 + q * cell, 21 + r * cell, cell - 1, cell - 1);
        }),
      );
      return c.toDataURL('image/png');
    },
    { cells, colors: TEST_COLORS },
  );
  const file = testInfo.outputPath('my chart.png');
  writeFileSync(file, Buffer.from(dataUrl.split(',')[1]!, 'base64'));

  await page.getByTestId('import-picture').setInputFiles(file);
  await expect(page.getByTestId('import-result')).toHaveText(/^40 × 30 stitches, 3 colors/);
  await noSidewaysScroll(page);
  await page.getByRole('button', { name: 'Create chart' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'my chart' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Chart, 40 by 30 squares/ })).toBeVisible();
});

test('importing a PDF pattern reads the size from its row and column numbers', async ({ page }, testInfo) => {
  const file = testInfo.outputPath('pattern.pdf');
  writeFileSync(file, await stitchFiddleLikePdf(randomChart(8, 30, 40, 2), 10));
  await page.goto('/#/charts/import');
  await page.getByTestId('import-picture').setInputFiles(file);
  await expect(page.getByText("Read the grid size from the pattern's row and column numbers: 30 × 40.")).toBeVisible();
  await expect(page.getByTestId('import-result')).toHaveText(/^30 × 40 stitches, 2 colors/);
  await page.getByRole('button', { name: 'Create chart' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'pattern' })).toBeVisible();
});

test('a tracker project file picked in Settings → Import opens as a chart', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByTestId('import-file').setInputFiles(fixture('heart-project.json'));
  await expect(page.getByText('it opened as a new chart: “Heart for Mum”')).toBeVisible();
  await page.getByRole('link', { name: 'Open the chart' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Heart for Mum' })).toBeVisible();
});

test('charts and their progress move to another device with a backup', async ({ page, browser }, testInfo) => {
  await page.goto('/#/charts');
  await page.getByTestId('open-project-file').setInputFiles(fixture('heart-project.json'));
  await expect(page.getByRole('heading', { level: 1, name: 'Heart for Mum' })).toBeVisible();

  await page.goto('/#/settings');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup file' }).click();
  const file = testInfo.outputPath('backup.json');
  await (await downloading).saveAs(file);

  const other = await browser.newContext();
  const pageB = await other.newPage();
  await pageB.goto('/#/settings');
  await pageB.getByTestId('import-file').setInputFiles(file);
  await expect(pageB.getByRole('region', { name: 'Import preview' })).toContainText('Charts: 1 new');
  await pageB.getByRole('button', { name: 'Import', exact: true }).click();
  await pageB.goto('/#/charts');
  await expect(pageB.getByText('Row 5 · 4 of 13 rows done')).toBeVisible();
  await other.close();
});
