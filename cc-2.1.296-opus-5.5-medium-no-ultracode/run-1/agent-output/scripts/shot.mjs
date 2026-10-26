// Usage: node scripts/shot.mjs <url> <out.png> [waitMs] [w] [h]
import { chromium } from 'playwright-core';
const [url, out, wait = '4000', w = '1400', h = '860'] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 }).catch(() => logs.push('timeout waiting ready'));
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
console.log('fps~', fps);
for (const l of logs.filter((l) => !l.includes('GPU stall'))) console.log(l);
await browser.close();
