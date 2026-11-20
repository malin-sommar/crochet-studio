// Draws the PNG app icons from the SVGs in public/, using Playwright's Chromium.
// Run with `npm run icons` after changing public/icon.svg or public/icon-maskable.svg.
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const pub = new URL('../public/', import.meta.url);
const jobs = [
  { src: 'icon.svg', out: 'icon-192.png', size: 192 },
  { src: 'icon.svg', out: 'icon-512.png', size: 512 },
  { src: 'icon-maskable.svg', out: 'icon-maskable-512.png', size: 512 },
];

const browser = await chromium.launch();
try {
  for (const { src, out, size } of jobs) {
    const svg = readFileSync(new URL(src, pub), 'utf8');
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}</style>` +
        `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${size}" height="${size}">`,
    );
    await page.locator('img').evaluate((img) => img.decode());
    await page.screenshot({ path: new URL(out, pub).pathname.replace(/^\/([A-Za-z]:)/, '$1'), omitBackground: true });
    await page.close();
    console.log(`public/${out}`);
  }
} finally {
  await browser.close();
}
