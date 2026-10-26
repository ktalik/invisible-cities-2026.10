# Fill captions/mottos (data/cities.ts), series blurbs (data/series.ts) and frame texts (data/frame.ts) from briefs/.
import json, os, re
B = 'briefs'
def clean(s):
    s = (s or '').strip()
    for ch in ['—', '–', '‒', '―', '−']:
        s = s.replace(ch, '-')
    s = s.replace('‘', "'").replace('’', "'").replace('“', '"').replace('”', '"')
    return s
def js(s):
    return json.dumps(clean(s), ensure_ascii=False)

p = 'src/data/cities.ts'
src = open(p).read()
n = 0
for f in os.listdir(B):
    if f.startswith('_') or not f.endswith('.json'): continue
    d = json.load(open(os.path.join(B, f)))
    cid = d['id']
    pat = re.compile(r"(\{ id: '" + cid + r"',[^\n]*?caption: )(?:'[^']*'|\"(?:[^\"\\\\]|\\\\.)*\")(, motto: )(?:'[^']*'|\"(?:[^\"\\\\]|\\\\.)*\")( \})")
    new, k = pat.subn(lambda m: m.group(1) + js(d.get('caption')) + m.group(2) + js(d.get('motto')) + m.group(3), src)
    if k: src = new; n += 1
open(p, 'w').write(src)

p = 'src/data/series.ts'
s = open(p).read()
for f in os.listdir(B):
    if not f.startswith('_series_'): continue
    d = json.load(open(os.path.join(B, f)))
    sid = d['series']
    s = re.sub(r"(\{ id: '" + sid + r"',[^\n]*?blurb: )(?:'[^']*'|\"(?:[^\"\\\\]|\\\\.)*\")( \})", lambda m: m.group(1) + js(d.get('seriesBlurb')) + m.group(2), s)
open(p, 'w').write(s)

fr = os.path.join(B, '_frame.json')
if os.path.exists(fr):
    d = json.load(open(fr))
    inter = ',\n'.join('    { chapter: %d, title: %s, text: %s }' % (c['chapter'], js(c['title']), js(c['text'])) for c in sorted(d['chapterInterludes'], key=lambda c: c['chapter']))
    out = """// Frame texts (original paraphrases written for this atlas, not quotations).

export interface Interlude {
  chapter: number;
  title: string;
  text: string;
}

export const FRAME = {
  introTitle: %s,
  introText: %s,
  chapterInterludes: [
%s,
  ] as Interlude[],
  epilogueText: %s,
  veniceNote: %s,
  atlasNote: %s,
  aboutText: %s,
};
""" % (js(d['introTitle']), js(d['introText']), inter, js(d['epilogueText']), js(d['veniceNote']), js(d['atlasNote']), js(d['aboutText']))
    open('src/data/frame.ts', 'w').write(out)
print('captions applied:', n)
