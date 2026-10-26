// End-to-end flow through the real app with screenshots:
//   node scripts/dev/flow.mjs [base=http://127.0.0.1:5173/] [outDir=shots/flow] [w=1440] [h=900]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const [base = 'http://127.0.0.1:5173/', out = 'shots/flow', w = '1440', h = '900'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl', '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
const shot = async (name) => {
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
};

await page.goto(base, { waitUntil: 'domcontentloaded' });
await wait(6);
await shot('01-intro');
await page.keyboard.press('Enter');
await wait(5);
await shot('02-atlas');
// hover a medallion (Despina) using the app's own projection
const pos = await page.evaluate(() => {
  const app = window.__app;
  const p = app.atlas.medalPosition('despina').project(app.stage.camera);
  return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
});
await page.mouse.move(pos.x, pos.y);
await wait(1.5);
await shot('03-atlas-hover');
await page.mouse.click(pos.x, pos.y);
await wait(8);
await shot('04-city');
await page.keyboard.press('ArrowRight');
await wait(8);
await shot('05-next-city');
await page.keyboard.press(' ');
await wait(5);
await shot('06-interaction');
await page.keyboard.press('i');
await wait(1.5);
await shot('07-index');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await wait(6);
await shot('08-back-to-atlas');
const venice = await page.evaluate(() => {
  const app = window.__app;
  return { x: innerWidth / 2, y: innerHeight / 2, mode: app.mode };
});
void venice;
await page.evaluate(() => {
  location.hash = '#/venice';
});
await wait(8);
await shot('09-venice');
await page.evaluate(() => {
  location.hash = '#/epilogue';
});
await wait(9);
await shot('10-epilogue');
console.log(JSON.stringify({ errors: [...new Set(errors)].slice(0, 20) }, null, 1));
await browser.close();
