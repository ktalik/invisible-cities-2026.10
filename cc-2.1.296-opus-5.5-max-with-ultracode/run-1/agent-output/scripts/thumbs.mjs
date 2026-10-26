#!/usr/bin/env node
// Render a square thumbnail of every city for the atlas medallions:
//   node scripts/thumbs.mjs [id ...]      -> public/thumbs/<id>.jpg
// Uses the dev server on :5173 when running, otherwise a private Vite server.

import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/thumbs');
mkdirSync(outDir, { recursive: true });
const all = readdirSync(resolve(root, 'src/cities'))
  .filter((f) => f.endsWith('.ts') && !f.startsWith('_') && f !== 'registry.ts')
  .map((f) => f.replace('.ts', ''));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : all;
const size = Number(process.env.THUMB_SIZE || 512);
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
const failures = [];
for (const id of ids) {
  const page = await browser.newPage();
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  try {
    await page.goto(`${base}/?shot=${id}&view=0&t=${process.env.THUMB_T || 8}&w=${size}&h=${size}&thumb=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction('window.__shot && window.__shot.ready', { timeout: 180000, polling: 200 });
    const info = await page.evaluate('window.__shot');
    if (info?.error) throw new Error(info.error);
    await page.screenshot({ path: `${outDir}/${id}.jpg`, type: 'jpeg', quality: 86 });
    console.log('ok', id);
  } catch (e) {
    failures.push(id);
    console.log('FAIL', id, String(e).slice(0, 200));
  }
  await page.close();
}
await browser.close();
if (server) await server.close();
console.log(`done: ${ids.length - failures.length}/${ids.length}` + (failures.length ? ` failed: ${failures.join(', ')}` : ''));
