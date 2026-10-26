# Summarise all workflow journals: which agents started / finished, per label.
import json, os, glob
base = '/home/konrad/.claude/projects/-home-konrad-dane-workspace--upstream-invisible-cities-one-shot-claude-code-opus-5-5-max-ultracode-on/a9cff0e1-91c2-4827-86d2-d0841e12abbd/subagents/workflows'
done, running = {}, {}
for j in glob.glob(base + '/wf_*/journal.jsonl'):
    labels = {}
    for line in open(j):
        d = json.loads(line)
        if d.get('type') == 'started':
            labels[d['key']] = d.get('label')
            running[d.get('label')] = os.path.basename(os.path.dirname(j))
        elif d.get('type') == 'result':
            lab = labels.get(d['key'])
            r = d.get('result')
            if isinstance(r, dict):
                done[lab] = r.get('status') or r.get('verdict') or ('overall %s' % r.get('overall')) or 'ok'
            else:
                done[lab] = 'null' if r is None else str(r)[:20]
            running.pop(lab, None)
print('DONE:', ', '.join(f'{k}={v}' for k, v in sorted(done.items())))
print('RUNNING:', ', '.join(sorted(k for k in running if k)))
