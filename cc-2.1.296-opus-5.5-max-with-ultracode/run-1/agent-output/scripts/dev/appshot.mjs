// Screenshot the interactive app: node scripts/dev/appshot.mjs '<hash>' out.png [waitSeconds] [w] [h] [js-to-eval-before]
import puppeteer from 'puppeteer-core';
const [hash = '#/', out = 'shots/app.png', wait = '6', w = '1440', h = '900', pre = ''] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl', '--hide-scrollbars', '--mute-audio', `--window-size=${w},${h}`] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await page.goto('http://127.0.0.1:5173/' + hash, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 1500));
if (pre) { await page.evaluate(pre); }
await new Promise((r) => setTimeout(r, +wait * 1000));
await page.screenshot({ path: out });
console.log(JSON.stringify({ out, errors }, null, 1));
await browser.close();
