"""Backup copy of the Fox News live-results feed (used by the app only if the browser can't reach Fox directly).
Writes data/results.json with the raw feed files, trimmed. Never invents data: files that fail to download are kept
from the previous snapshot (with their original timestamp) or omitted."""
import json, gzip, os, sys, urllib.request, email.utils, datetime as dt
YEAR = os.environ.get('RESULTS_YEAR', '2026')
BASE = f'https://feeds-elections.foxnews.com/archive/politics/elections/{YEAR}/3/{YEAR}_Generals'
STATES = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split()
PATHS = ['Senate/national_level_summary', 'Governor/national_level_summary', 'House/national_level_summary', 'seat_holders'] + [f'House/{s}/state_level_results' for s in STATES]
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'results.json')

def trim(o):
    if isinstance(o, dict):
        return {k: trim(v) for k, v in o.items() if k not in ('headshotPath', 'vote_types', 'delegates', 'lookup')}
    if isinstance(o, list):
        return [trim(x) for x in o]
    return o

def get(path):
    req = urllib.request.Request(f'{BASE}/{path}/file.json', headers={'User-Agent': 'Mozilla/5.0 (midterm-tracker results backup)', 'Accept-Encoding': 'gzip'})
    with urllib.request.urlopen(req, timeout=20) as r:
        b = r.read()
        lm = r.headers.get('Last-Modified')
    if b[:2] == b'\x1f\x8b':
        b = gzip.decompress(b)
    ms = int(email.utils.parsedate_to_datetime(lm).timestamp() * 1000) if lm else None
    return {'last_modified': ms, 'data': trim(json.loads(b))}

def main():
    try:
        old = json.load(open(OUT))
    except Exception:
        old = {'files': {}}
    files, errors = {}, []
    for p in PATHS:
        try:
            f = get(p)
            if p.endswith('state_level_results'):  # only the expected-vote share is used from these files
                d = f['data']
                f['data'] = {'last_updated': d.get('last_updated'), 'races': [{'district': r.get('district'), 'districtTotals': r.get('districtTotals')} for r in d.get('races', [])]}
            files[p] = f
        except Exception as e:
            errors.append(f'{p}: {e}')
            if p in old.get('files', {}):
                files[p] = old['files'][p]
    if not files:
        print('no data fetched', errors); sys.exit(1)
    if {k: v for k, v in old.get('files', {}).items()} == files:
        print('unchanged; not rewriting'); return
    out = {'source': 'Fox News election results feed', 'source_url': 'https://www.foxnews.com/elections', 'base': BASE,
           'fetched_utc': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'), 'errors': errors, 'files': files}
    json.dump(out, open(OUT, 'w'), separators=(',', ':'))
    print('wrote', OUT, len(files), 'files', len(errors), 'errors')

if __name__ == '__main__':
    main()
