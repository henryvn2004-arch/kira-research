// Unit tests for the draft-review guards in api/_lib/moves/review.js. Run: npm run test:unit
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDecision, companyKey, isHttpUrl } from '../api/_lib/moves/review.js';

const NOW = new Date('2026-11-23T00:00:00Z');
const draft = (o = {}) => ({ id: 8, status: 'draft', url: 'https://example.com/a', title: 't', company: 'Acme Co., Ltd.', investor_country: 'JP', host_country: 'VN',
  type: 'plant', event_date: '2026-11-20', raw: { x: 1 }, ...o });
const pub = (o = {}) => ({ id: 3, company: 'ACME Corporation', host_country: 'VN', type: 'plant', event_date: '2026-10-15', ...o });
const publish = (extra = {}) => ({ id: 8, decision: 'publish', reason: 'new plant announced', ...extra });

test('publish: a complete draft goes through, reviewer and reason are recorded, raw is kept', () => {
  const r = checkDecision(draft(), publish(), [], NOW);
  assert.equal(r.ok, true);
  assert.equal(r.patch.status, 'published');
  assert.equal(r.patch.reviewed_by, 'routine');
  assert.equal(r.patch.raw.x, 1);
  assert.equal(r.patch.raw.review.reason, 'new plant announced');
});

test('publish: the decision can fill the company and the investor the rules could not find', () => {
  const r = checkDecision(draft({ company: null, investor_country: null }), publish({ company: 'KLA', investor_country: 'us' }), [], NOW);
  assert.equal(r.ok, true);
  assert.equal(r.patch.investor_country, 'US');
  assert.equal(r.patch.company, 'KLA');
});

test('publish guards: url, company, host, investor, domestic, type', () => {
  assert.equal(checkDecision(draft({ url: 'javascript:alert(1)' }), publish(), [], NOW).error, 'bad_url');
  assert.equal(checkDecision(draft({ url: 'ftp://x/y' }), publish(), [], NOW).error, 'bad_url');
  assert.equal(checkDecision(draft({ company: '  ' }), publish(), [], NOW).error, 'company_required');
  assert.equal(checkDecision(draft({ host_country: 'US' }), publish(), [], NOW).error, 'host_not_a_market');
  assert.equal(checkDecision(draft({ host_country: null }), publish(), [], NOW).error, 'host_not_a_market');
  assert.equal(checkDecision(draft({ investor_country: null }), publish(), [], NOW).error, 'investor_unknown');
  assert.equal(checkDecision(draft({ investor_country: 'ZZ' }), publish(), [], NOW).error, 'investor_unknown');
  assert.equal(checkDecision(draft({ investor_country: 'VN' }), publish(), [], NOW).error, 'domestic_company');
  assert.equal(checkDecision(draft(), publish({ type: 'rumour' }), [], NOW).error, 'bad_type');
});

test('every decision needs a reason; only drafts can be decided', () => {
  assert.equal(checkDecision(draft(), publish({ reason: ' ' }), [], NOW).error, 'reason_required');
  assert.equal(checkDecision(draft(), { id: 8, decision: 'maybe', reason: 'x' }, [], NOW).error, 'bad_decision');
  assert.equal(checkDecision(draft({ status: 'published' }), publish(), [], NOW).error, 'not_a_draft');
  assert.equal(checkDecision(null, publish(), [], NOW).error, 'not_a_draft');
});

test('reject: needs only a reason, even when the draft is incomplete', () => {
  const r = checkDecision(draft({ url: 'nope', company: null, host_country: null }), { id: 8, decision: 'reject', reason: 'opinion piece' }, [], NOW);
  assert.equal(r.ok, true);
  assert.equal(r.patch.status, 'rejected');
  assert.equal(r.patch.reviewed_by, 'routine');
});

test('duplicates: same company (legal suffix ignored) + host + type within 60 days is rejected, outside it is not', () => {
  const r = checkDecision(draft(), publish(), [pub()], NOW);
  assert.equal(r.duplicate_of, 3);
  assert.equal(r.patch.status, 'rejected');
  assert.match(r.patch.raw.review.reason, /^duplicate of #3/);
  assert.equal(checkDecision(draft(), publish(), [pub({ event_date: '2026-08-01' })], NOW).patch.status, 'published');
  assert.equal(checkDecision(draft(), publish(), [pub({ host_country: 'TH' })], NOW).patch.status, 'published');
  assert.equal(checkDecision(draft(), publish(), [pub({ type: 'jv' })], NOW).patch.status, 'published');
  assert.equal(checkDecision(draft(), publish(), [pub({ company: 'Other Corp' })], NOW).patch.status, 'published');
});

test('helpers', () => {
  assert.equal(companyKey('Acme Co., Ltd.'), companyKey('ACME Corporation'));
  assert.equal(isHttpUrl('https://a.b/c'), true);
  assert.equal(isHttpUrl('not a url'), false);
});

test('a BizDirect press draft with a non-Latin company name and a local news domain passes the same guards', () => {
  const row = draft({ source_key: 'bizdirect_press', url: 'https://vnexpress.net/tin-tuc/abc-123.html', company: 'トヨタ自動車', title: 'Toyota opens a plant in Vietnam', raw: { hq_country: 'JP' } });
  const r = checkDecision(row, publish(), [], NOW);
  assert.equal(r.ok, true);
  assert.equal(r.patch.status, 'published');
  assert.ok(companyKey('トヨタ自動車').length > 0);
});

test('bridge guards: aggregator url, domain mismatch, non-English title, investor vs HQ (Teneo case)', () => {
  const b = (o = {}) => draft({ source_key: 'bizdirect_press', domain: 'example.com', title: 'Acme opens a plant in Vietnam', raw: { hq_country: 'JP' }, ...o });
  assert.equal(checkDecision(b(), publish(), [], NOW).ok, true);
  assert.equal(checkDecision(draft({ url: 'https://news.google.com/rss/articles/abc' }), publish(), [], NOW).error, 'aggregator_url');
  assert.equal(checkDecision(b({ domain: 'news.google.com', url: 'https://news.google.com/x' }), publish(), [], NOW).error, 'aggregator_url');
  assert.equal(checkDecision(b({ url: 'https://other.com/a' }), publish(), [], NOW).error, 'url_domain_mismatch');
  assert.equal(checkDecision(b({ url: 'https://www.example.com/a' }), publish(), [], NOW).ok, true);
  assert.equal(checkDecision(b({ title: '工場をベトナムに新設' }), publish(), [], NOW).error, 'title_not_english');
  assert.equal(checkDecision(b({ raw: {} }), publish(), [], NOW).error, 'hq_country_missing');
  assert.equal(checkDecision(b({ investor_country: 'AU', raw: { hq_country: 'US' } }), publish(), [], NOW).error, 'investor_mismatch_hq');
  assert.equal(checkDecision(b({ investor_country: 'AU', raw: { hq_country: 'US' } }), publish({ investor_country: 'US' }), [], NOW).ok, true);
  assert.equal(checkDecision(draft({ title: '工場' }), publish(), [], NOW).ok, true); // non-bridge sources keep their own rules
});
