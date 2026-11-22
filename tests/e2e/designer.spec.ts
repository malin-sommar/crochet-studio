import { expect, test, type Page } from '@playwright/test';

async function noSidewaysScroll(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(scroll, 'page is wider than the screen').toBeLessThanOrEqual(width);
}

async function openExample(page: Page) {
  await page.goto('/#/designer');
  await page.getByRole('button', { name: 'Try an example' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Striped moss scarf' })).toBeVisible();
}

const size = (page: Page) => page.getByTestId('design-size');

test('the example scarf shows its size, a picture and a close-up, and fits the screen', async ({ page }) => {
  await openExample(page);
  await expect(size(page)).toHaveText('About 18.8 cm × 149 cm · 268 rows · row 1 at the bottom');
  await expect(page.getByRole('img', { name: /Picture of the whole piece/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /Close-up of rows/ })).toBeVisible();
  await expect(page.getByText('Start with a chain of 31.')).toBeVisible();
  await noSidewaysScroll(page);
});

test('a width that does not fit is explained, and fixed with one tap', async ({ page }) => {
  await openExample(page);
  const width = page.getByTestId('width-stitches');
  await width.fill('31');
  await width.press('Enter');
  await expect(page.getByText(/Moss stitch needs an even number of stitches, at least 6, so 31 doesn't fit/)).toBeVisible();
  await page.getByRole('button', { name: 'Use 30 stitches' }).click();
  await expect(page.getByText(/doesn't fit/)).toHaveCount(0);
  await expect(width).toHaveValue('30');
});

test('blocks of rows can be added, changed and undone', async ({ page }) => {
  await openExample(page);
  await page.getByRole('button', { name: '+ Add a block' }).click();
  const block = page.getByRole('region', { name: 'Block 4' });
  await expect(block).toContainText('Rows 269–270');
  await block.getByRole('combobox', { name: 'Stitch' }).selectOption('dc');
  await block.getByRole('button', { name: 'More: Rows' }).click();
  await expect(block).toContainText('Rows 269–271');
  await expect(size(page)).toContainText('271 rows');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(size(page)).toContainText('270 rows');
});

test('a weighed swatch gives meters and balls per color', async ({ page }) => {
  await openExample(page);
  await expect(page.getByTestId('yarn-basis')).toContainText('Rough estimate');
  const grams = page.getByTestId('swatch-grams');
  await grams.fill('10');
  await grams.press('Enter');
  await expect(page.getByTestId('yarn-basis')).toHaveText('From your weighed swatch. The ball count includes 10% extra.');
  const mustard = page.locator('.yarn-table tbody tr').filter({ hasText: 'Mustard' });
  // 88 moss rows × 30 stitches × 0.85 × (20 m / 288) ≈ 156 m → 1 ball of 200 m
  await expect(mustard).toContainText('156 m');
  await expect(mustard.locator('td').nth(2)).toHaveText('1');
});

test('crochet mode writes every row out, warns about color changes and remembers the row', async ({ page }, testInfo) => {
  await openExample(page);
  await page.getByRole('navigation', { name: 'Mode' }).getByRole('link', { name: 'Crochet' }).click();
  await expect(page.locator('.rownum')).toHaveText('Row 1 of 268');
  await expect(page.getByText('Start: Chain 31 in Cream.')).toBeVisible();
  await expect(page.getByTestId('row-instructions')).toHaveText('Sc in the 2nd ch from the hook and in each ch across (30 sts), turn.');
  await page.getByRole('button', { name: 'Done, next row →' }).click();
  await expect(page.getByText('Next row is Mustard: join it on the last yarn over of this row.')).toBeVisible();
  await page.getByRole('button', { name: 'Done, next row →' }).click();
  await expect(page.locator('.rownum')).toHaveText('Row 3 of 268');
  await expect(page.getByTestId('row-instructions')).toContainText('Ch 2 (makes the first space), sc in the 2nd st');
  await noSidewaysScroll(page);
  if (testInfo.project.name === 'phone') {
    await expect(page.getByRole('navigation', { name: 'Sections' })).toBeHidden();
  }
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.locator('.rownum')).toHaveText('Row 3 of 268');
  await expect(page.getByText('2 of 268 rows done')).toBeVisible();
});

test('instructions follow the terms setting', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByText('UK', { exact: true }).click();
  await openExample(page);
  await page.getByRole('navigation', { name: 'Mode' }).getByRole('link', { name: 'Crochet' }).click();
  await expect(page.getByTestId('row-instructions')).toHaveText('Dc in the 2nd ch from the hook and in each ch across (30 sts), turn.');
});

test('"Use in a design" on a stitch page starts a design that fits the stitch', async ({ page }) => {
  await page.goto('/#/stitches/shell');
  await page.getByRole('button', { name: 'New design with this stitch' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Shell stitch design' })).toBeVisible();
  await expect(page.getByTestId('width-stitches')).toHaveValue('31');
  await expect(page.getByText(/doesn't fit/)).toHaveCount(0);
  await expect(size(page)).toContainText('10 rows');
});

test('"Use in a design" can add a stitch to an existing design', async ({ page }) => {
  await openExample(page);
  await page.goto('/#/stitches/blo-flo');
  await page.getByRole('button', { name: 'Add to this design' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Striped moss scarf' })).toBeVisible();
  await expect(size(page)).toContainText('278 rows');
  const added = page.getByRole('region', { name: 'Block 4' });
  await expect(added.getByRole('combobox', { name: 'Loop' })).toHaveValue('blo');
});

test('a deleted design goes to the Trash and can be restored', async ({ page }) => {
  await openExample(page);
  await page.getByRole('button', { name: 'Delete design' }).click();
  await page.getByRole('button', { name: 'Move to Trash' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'No designs yet' })).toBeVisible();
  await page.goto('/#/settings');
  const trash = page.locator('section', { has: page.getByRole('heading', { name: 'Trash' }) });
  await trash.getByRole('button', { name: 'Restore' }).click();
  await page.goto('/#/designer');
  await expect(page.getByRole('link', { name: 'Striped moss scarf' })).toBeVisible();
});
