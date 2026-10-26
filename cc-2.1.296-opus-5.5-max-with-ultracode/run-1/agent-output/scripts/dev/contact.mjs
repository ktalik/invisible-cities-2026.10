// Contact sheet of city screenshots: node scripts/dev/contact.mjs out.png [dir=public/thumbs] [cols=8]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
const [out = 'shots/contact.png', dir = 'public/thumbs', cols = '8'] = process.argv.slice(2);
const order = ['diomira','isidora','dorothea','zaira','anastasia','tamara','zora','despina','zirma','isaura','maurilia','fedora','zoe','zenobia','euphemia','zobeide','hypatia','armilla','chloe','valdrada','olivia','sophronia','eutropia','zemrude','aglaura','octavia','ersilia','baucis','leandra','melania','esmeralda','phyllis','pyrrha','adelma','eudoxia','moriana','clarice','eusapia','beersheba','leonia','irene','argia','thekla','trude','olinda','laudomia','perinthia','procopia','raissa','andria','cecilia','marozia','penthesilea','theodora','berenice'];
const files = new Set(readdirSync(dir));
const cells = order.filter((id) => files.has(id + '.jpg') || files.has(id + '.png')).map((id) => {
  const f = files.has(id + '.jpg') ? id + '.jpg' : id + '.png';
  const b64 = readFileSync(resolve(dir, f)).toString('base64');
  return `<figure><img src="data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,${b64}"><figcaption>${order.indexOf(id) + 1}. ${id}</figcaption></figure>`;
});
const html = `<html><body style="margin:0;background:#111;font-family:Georgia;color:#eee"><div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:6px">${cells.join('')}</div>
<style>figure{margin:0}img{width:100%;display:block}figcaption{font-size:13px;padding:2px 4px}</style></body></html>`;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('wrote', out, cells.length, 'cells');
