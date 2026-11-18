#!/usr/bin/env python3
"""Load the plain text of every archived report into `content_fulltext_reports` (migration 069).

Why: the full report is not in the database (report_translations.full_content is null, reports-html holds a
5-page preview). /api/brand-mentions in kira-research searches this table to tell BizDirect Asia which
reports name a brand. The text is only ever searched inside Postgres; the API returns catalogue fields and
a count, never a passage.

    python3 scripts/load-report-fulltext.py --dry-run          # extract + stats, no network
    KIRA_SUPABASE_URL=... KIRA_SUPABASE_SERVICE_KEY=... python3 scripts/load-report-fulltext.py
    ... --batch 2027-jp-eldercare                              # one folder (after publishing a new report)
    ... --archive /path/to/kira-pipeline/report-archive/batch  # default: ../kira-pipeline/report-archive/batch

The archive (private kira-pipeline repo) stays where it is: this script only reads it and writes to Postgres.

Mapping archive folder -> report: report_queue.id is the folder name; report_queue.output_paths holds
'reports-pdfs/<living_reports.id>/en.pdf|...'. Folders without a published report are skipped.
Idempotent (upsert on slug+locale, skipped when the sha1 is unchanged). Keys come from the environment only
(KIRA_SUPABASE_URL / KIRA_SUPABASE_SERVICE_KEY, or the SUPABASE_URL / SUPABASE_SERVICE_KEY the batch Routine already has).

BizDirect Asia copies this table (and the published transcripts) into its own database every day (BizDirect `seo/kira_fulltext.py`)
and searches there; this table is the hand-over point for report text, so run this after every publish (batch_runner Step 5.3b-8).
"""
import argparse, datetime, hashlib, html, json, os, re, sys, urllib.parse, urllib.request
from html.parser import HTMLParser

DEFAULT_ARCHIVE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'kira-pipeline', 'report-archive', 'batch')
LOCALES = ('en', 'ja', 'ko', 'zh')


class _Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.out.append(data)


def plain_text(raw):
    p = _Text()
    p.feed(raw)
    return re.sub(r'\s+', ' ', html.unescape(' '.join(p.out))).strip()


def rest(path, base, key, method='GET', body=None, prefer=None):
    headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    if prefer:
        headers['Prefer'] = prefer
    req = urllib.request.Request(f'{base}/rest/v1/{path}', method=method, headers=headers,
                                 data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
        return json.loads(data) if data else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--batch', help='only this archive folder')
    ap.add_argument('--archive', default=DEFAULT_ARCHIVE, help='report-archive/batch directory of kira-pipeline')
    a = ap.parse_args()
    folders = [a.batch] if a.batch else sorted(d for d in os.listdir(a.archive) if os.path.isdir(os.path.join(a.archive, d)))
    docs = {}
    for b in folders:
        for loc in LOCALES:
            f = os.path.join(a.archive, b, f'{loc}.html')
            if os.path.exists(f):
                with open(f, encoding='utf-8') as fh:
                    docs[(b, loc)] = plain_text(fh.read())
    total = sum(len(t) for t in docs.values())
    print(f'{len(docs)} documents from {len({b for b, _ in docs})} folders, {total/1e6:.1f} M characters')
    if a.dry_run:
        return
    base = os.environ.get('KIRA_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
    key = os.environ.get('KIRA_SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_SERVICE_KEY')
    if not base or not key:
        sys.exit('set KIRA_SUPABASE_URL and KIRA_SUPABASE_SERVICE_KEY (or SUPABASE_URL and SUPABASE_SERVICE_KEY)')
    ids = ','.join(f'"{b}"' for b in sorted({b for b, _ in docs}))
    queue = rest(f'report_queue?id=in.({urllib.parse.quote(ids)})&select=id,output_paths', base, key)
    rid = {}
    for q in queue:
        m = re.match(r'reports-pdfs/([0-9a-f-]{36})/', q.get('output_paths') or '')
        if m:
            rid[q['id']] = m.group(1)
    reps = rest(f'living_reports?id=in.({",".join(rid.values())})&status=eq.published&select=id,slug', base, key)
    slug = {r['id']: r['slug'] for r in reps}
    have = {(r['slug'], r['locale']): r['body_sha1'] for r in rest('content_fulltext_reports?select=slug,locale,body_sha1&limit=5000', base, key)}
    rows, skipped = [], 0
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for (b, loc), text in docs.items():
        r_id = rid.get(b)
        if not r_id or r_id not in slug:
            skipped += 1
            continue
        sha = hashlib.sha1(text.encode()).hexdigest()
        if have.get((slug[r_id], loc)) == sha:
            continue
        rows.append({'slug': slug[r_id], 'locale': loc, 'report_id': r_id, 'body': text, 'body_sha1': sha, 'updated_at': now})
    for i in range(0, len(rows), 20):
        chunk = rows[i:i + 20]
        rest('content_fulltext_reports?on_conflict=slug,locale', base, key, 'POST', chunk, 'resolution=merge-duplicates,return=minimal')
    print(f'upserted {len(rows)} documents, {skipped} skipped (no published report for the folder)')


if __name__ == '__main__':
    main()
