#!/usr/bin/env node
// Load every city in headless Chromium and report errors and render statistics.
//   node scripts/sweep.mjs [id ...] [--shots dir]
// Exit code 1 when any city errors or misses the performance budget.

import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const shotsIdx = argv.indexOf('--shots');
const shotsDir = shotsIdx >= 0 ? resolve(root, argv[shotsIdx + 1]) : null;
const ids = argv.filter((a, i) => !a.startsWith('--') && (shotsIdx < 0 || i !== shotsIdx + 1));
const all = readdirSync(resolve(root, 'src/cities'))
  .filter((f) => f.endsWith('.ts') && !f.startsWith('_') && f !== 'registry.ts')
  .map((f) => f.replace('.ts', ''));
const list = ids.length ? ids : all;
if (shotsDir) mkdirSync(shotsDir, { recursive: true });
const chrome = process.env.CHROME_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find((p) => existsSync(p));

async function alive(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}
let server = null;
let base = process.env.SHOT_BASE || 'http://127.0.0.1:5173';
if (!(await alive(base + '/'))) {
  const { createServer } = await import('vite');
  server = await createServer({ root, logLevel: 'error', server: { port: 0, host: '127.0.0.1', hmr: false } });
  await server.listen();
  base = server.resolvedUrls.local[0].replace(/\/$/, '');
}
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl', '--hide-scrollbars', '--mute-audio'],
});
const rows = [];
let bad = 0;
for (const id of list) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e?.message || e)));
  let info = null;
  try {
    await page.goto(`${base}/?shot=${id}&t=10`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.__shot && window.__shot.ready', { timeout: 180000, polling: 250 });
    info = await page.evaluate('window.__shot');
    if (info?.error) errors.push(info.error.split('\n')[0]);
    if (shotsDir) await page.screenshot({ path: `${shotsDir}/${id}.jpg`, type: 'jpeg', quality: 80 });
  } catch (e) {
    errors.push('harness: ' + String(e).slice(0, 160));
  }
  await page.close();
  const st = info?.stats ?? {};
  const over = (st.frameMs ?? 0) > 14 || (st.triangles ?? 0) > 1.8e6 || (st.calls ?? 0) > 300 || (info?.buildMs ?? 0) > 2500;
  if (errors.length || over) bad++;
  rows.push({ id, ok: !errors.length, frameMs: st.frameMs, tris: st.triangles, calls: st.calls, buildMs: info?.buildMs, interaction: info?.hasInteraction, over, error: errors[0]?.slice(0, 140) });
  console.log(`${errors.length ? 'ERR ' : over ? 'SLOW' : 'ok  '} ${id.padEnd(12)} frame ${String(st.frameMs ?? '-').padStart(5)}ms  tris ${String(st.triangles ?? '-').padStart(8)}  calls ${String(st.calls ?? '-').padStart(4)}  build ${String(info?.buildMs ?? '-').padStart(5)}ms  ${info?.hasInteraction ? 'toggle' : ''} ${errors[0] ? '| ' + errors[0].slice(0, 120) : ''}`);
}
await browser.close();
if (server) await server.close();
console.log(`\n${list.length - bad}/${list.length} cities clean`);
process.exit(bad ? 1 : 0);
