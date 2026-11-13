"""Manual link-change triage. No writes to the catalog. Compare two reports via --previous."""
import argparse, datetime, hashlib, json, pathlib, urllib.request, urllib.error
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
LIMIT = 2 * 1024 * 1024

def inventory():
    records = json.loads((ROOT/'ingredient-evidence.json').read_text())['ingredients']
    urls = {s['url'] for x in records.values() for s in x['sources']}
    products = json.loads((ROOT/'products-data.json').read_text())['products']
    urls.update(x['formulationSource'] for x in products.values() if x.get('formulationSource'))
    return sorted(u for u in urls if urlparse(u).scheme == 'https')

def check(url, old):
    row = {'url': url, 'last_automated_source_check': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'SupplementIntelligence-SourceCheck/1.0'})
        with urllib.request.urlopen(req, timeout=8) as resp:
            body = resp.read(LIMIT+1)
            if len(body)>LIMIT: return dict(row, status='too_large_to_compare')
            digest = hashlib.sha256(body).hexdigest()
            return dict(row, status=('baseline' if not old else 'unchanged' if old==digest else 'changed_needs_review'), sha256=digest)
    except (OSError, ValueError) as exc:
        return dict(row, status='unavailable_needs_review', error=type(exc).__name__)

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--check', action='store_true', help='Fetch sources; default lists URLs offline')
    p.add_argument('--limit', type=int, default=5)
    p.add_argument('--offset', type=int, default=0)
    p.add_argument('--previous', type=pathlib.Path)
    a = p.parse_args()
    if not 1 <= a.limit <= 50 or a.offset < 0: p.error('limit 1..50; offset >= 0')
    urls = inventory()[a.offset:a.offset+a.limit]
    old = {r['url']:r.get('sha256') for r in json.loads(a.previous.read_text())} if a.previous else {}
    print(json.dumps([check(u,old.get(u)) if a.check else {'url':u,'status':'not_checked'} for u in urls],indent=2))
