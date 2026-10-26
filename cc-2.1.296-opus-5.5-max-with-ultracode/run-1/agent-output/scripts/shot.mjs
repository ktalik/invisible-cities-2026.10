#!/usr/bin/env node
// Screenshot harness for city modules.
//
//   node scripts/shot.mjs <cityId|atlas> [--views 0,1,2] [--t 6] [--toggle] [--both]
//                         [--w 1280] [--h 800] [--out shots/<id>] [--quiet]
//
// Uses the dev server on http://127.0.0.1:5173 if it is running, otherwise starts
// a private Vite server. Prints a JSON report (errors, warnings, render stats) and
// writes PNGs you can open with an image viewer (or the Read tool).

import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const id = argv[0];
if (!id || id.startsWith('--')) {
  console.error('usage: node scripts/shot.mjs <cityId|atlas> [--views 0,1,2] [--t 6] [--toggle] [--both] [--w 1280] [--h 800] [--out dir]');
  process.exit(2);
}
const opt = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const flag = (name) => argv.includes('--' + name);
const views = String(opt('views', '0')).split(',').map(Number);
const t = Number(opt('t', 6));
const w = Number(opt('w', 1280));
const h = Number(opt('h', 800));
const out = resolve(root, opt('out', `shots/${id}`));
const toggles = flag('both') ? [false, true] : [flag('toggle')];
const chrome = process.env.CHROME_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find((p) => existsSync(p));

async function alive(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return r.ok;
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

mkdirSync(out, { recursive: true });
// Headless Chromium can use the real GPU through ANGLE/OpenGL; SHOT_GPU=0 forces SwiftShader.
const gpu = process.env.SHOT_GPU !== '0';
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: [
    '--no-sandbox',
    '--ignore-gpu-blocklist',
    ...(gpu ? ['--enable-gpu', '--use-angle=gl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
    `--window-size=${w},${h}`,
    '--hide-scrollbars',
    '--mute-audio',
  ],
});

const report = { id, base, shots: [], errors: [], warnings: [] };
try {
  for (const toggle of toggles) {
    for (const v of views) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      page.on('console', (m) => {
        const type = m.type();
        const text = m.text();
        if (/\[vite\]|Download the React DevTools|GPU stall|Automatic fallback to software WebGL/.test(text)) return;
        if (type === 'error') report.errors.push(text);
        else if (type === 'warn' || type === 'warning') report.warnings.push(text);
      });
      page.on('pageerror', (e) => report.errors.push('pageerror: ' + (e?.stack || e?.message || String(e))));
      const url = `${base}/?shot=${encodeURIComponent(id)}&view=${v}&t=${t}&w=${w}&h=${h}${toggle ? '&toggle=1' : ''}`;
      const t0 = Date.now();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForFunction('window.__shot && window.__shot.ready', { timeout: 240000, polling: 200 });
      const info = await page.evaluate('window.__shot');
      const file = `${out}/${id}-v${v}${toggle ? '-toggle' : ''}.png`;
      await page.screenshot({ path: file, type: 'png' });
      report.shots.push({ file, view: v, toggle, ms: Date.now() - t0, ...info });
      if (info?.error) report.errors.push('build error: ' + info.error);
      await page.close();
    }
  }
} catch (e) {
  report.errors.push('harness: ' + (e?.stack || String(e)));
} finally {
  await browser.close();
  if (server) await server.close();
}
const uniq = (a) => [...new Set(a)];
report.errors = uniq(report.errors).slice(0, 30);
report.warnings = uniq(report.warnings).slice(0, 15);
console.log(JSON.stringify(report, null, 2));
process.exit(report.errors.length ? 1 : 0);
