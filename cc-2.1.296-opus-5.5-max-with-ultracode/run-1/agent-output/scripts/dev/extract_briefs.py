# Extract research results from a workflow journal into briefs/<id>.json
import json, sys, os
journal = sys.argv[1]
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
labels = {}
done = []
for line in open(journal):
    d = json.loads(line)
    if d.get('type') == 'started':
        labels[d['key']] = d.get('label')
    if d.get('type') == 'result':
        label = labels.get(d['key'], '?')
        r = d['result']
        if isinstance(r, str):
            try: r = json.loads(r)
            except Exception: continue
        if not r: continue
        if label == 'research:frame':
            if not os.path.exists(os.path.join(out, '_frame.json')):
                json.dump(r, open(os.path.join(out, '_frame.json'), 'w'), indent=2, ensure_ascii=False)
            done.append('frame')
            continue
        series = label.split(':')[1]
        meta = {'series': series, 'seriesBlurb': r.get('seriesBlurb'), 'seriesPalette': r.get('seriesPalette')}
        json.dump(meta, open(os.path.join(out, f'_series_{series}.json'), 'w'), indent=2, ensure_ascii=False)
        for c in r.get('cities', []):
            cid = c['id'].lower().strip()
            c['series'] = series
            path = os.path.join(out, f'{cid}.json')
            # builders of these series research their own cities: never overwrite their briefs
            if series in ('continuous', 'hidden') and os.path.exists(path): continue
            json.dump(c, open(path, 'w'), indent=2, ensure_ascii=False)
        done.append(series)
print('done:', done)
