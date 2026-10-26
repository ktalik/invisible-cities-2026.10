import puppeteer from 'puppeteer-core';
const gpu = process.argv[2] === 'gpu';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--ignore-gpu-blocklist', ...(gpu ? ['--enable-gpu','--use-angle=vulkan','--enable-features=Vulkan'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])] });
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 400 });
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const t0 = Date.now();
await page.goto('http://127.0.0.1:5173/?shot=diomira&w=640&h=400&t=1', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 1500));
  const s = await page.evaluate('JSON.stringify(window.__shot)');
  const gl = await page.evaluate(`(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); if (!g) return 'no webgl2'; const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'webgl2 ok'; })()`);
  console.log(((Date.now()-t0)/1000).toFixed(1)+'s', s, gl);
  if (s && JSON.parse(s)?.ready) break;
}
await page.screenshot({ path: '/tmp/claude-1000/dbg/test.png' });
await browser.close();
