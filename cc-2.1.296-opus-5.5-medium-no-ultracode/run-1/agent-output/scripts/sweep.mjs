// Visit every city and report console errors and frame rate.
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto('http://localhost:5199/?overview');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const ids = await page.evaluate(() => [...document.querySelectorAll('.city-label')].map((e) => e.dataset.id));
const rows = [];
for (const id of ids) {
  await page.evaluate((id) => window.__goto(id), id);
  const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 700) requestAnimationFrame(f); else r(Math.round(n / 0.7)); }; requestAnimationFrame(f); }));
  const info = await page.evaluate(() => window.__info());
  rows.push(`${id.padEnd(12)} fps ${fps}  calls ${info.calls}  tris ${info.tris}`);
}
console.log(rows.join('\n'));
console.log(logs.length ? logs.join('\n') : 'no errors');
await browser.close();
