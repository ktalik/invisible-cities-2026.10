// Usage: node scripts/shots.mjs <outdir> <query> id1 id2 ...
import { chromium } from 'playwright-core';
const [outdir, query, ...ids] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(`http://localhost:5199/?${query}#${ids[0]}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
for (const id of ids) {
  await page.evaluate((id) => window.__goto(id), id);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outdir}/${id}.png` });
}
for (const l of [...new Set(logs)].filter((l) => !l.includes('GPU stall') && !l.includes('deprecated') && !l.includes('PCFSoft'))) console.log(l);
await browser.close();
