import puppeteer from 'puppeteer-core';
const variants = [
  ['--use-angle=gl', '--enable-gpu'],
  ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu'],
  ['--use-angle=vulkan', '--enable-features=Vulkan,VulkanFromANGLE,DefaultANGLEVulkan', '--enable-gpu'],
  ['--use-gl=egl', '--enable-gpu'],
];
for (const v of variants) {
  try {
    const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--ignore-gpu-blocklist', ...v] });
    const page = await browser.newPage();
    await page.goto('about:blank');
    const gl = await page.evaluate(`(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); if (!g) return 'no webgl2'; const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'webgl2 ok'; })()`);
    console.log(v.join(' '), '=>', gl);
    await browser.close();
  } catch (e) { console.log(v.join(' '), 'ERR', e.message.slice(0, 100)); }
}
