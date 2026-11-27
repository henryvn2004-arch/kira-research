import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { orgLd, orgLdTag, SAME_AS } from '../api/_lib/org-ld.js';
import { fillTemplate } from '../api/_lib/ssr.js';
import { withOrgLd, files } from '../scripts/sync-org-ld.mjs';

const parse = (html) => [...html.matchAll(/<script type="application\/ld\+json" id="ld-organization">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('orgLd: Organization with name, url, logo; no parent/sub organization, no address, no invented sameAs', () => {
  for (const l of ['en', 'ja', 'ko', 'zh']) {
    const o = orgLd(l);
    assert.equal(o['@type'], 'Organization');
    assert.equal(o.name, 'KIRA Research');
    assert.equal(o.url, 'https://kiraresearch.com/');
    assert.match(o.logo, /^https:\/\/kiraresearch\.com\/.+\.png$/);
    assert.ok(o.description.length > 20);
    for (const k of ['parentOrganization', 'subOrganization', 'address', 'legalName', 'foundingLocation']) assert.ok(!(k in o), k);
    for (const u of o.sameAs || []) assert.match(u, /^https:\/\//);
  }
  assert.equal('sameAs' in orgLd('en'), SAME_AS.length > 0);
});

test('orgLdTag: valid JSON, id ld-organization', () => {
  const [o] = parse(orgLdTag('ja'));
  assert.equal(o['@id'], 'https://kiraresearch.com/#organization');
});

test('fillTemplate: Organization is in the server HTML exactly once', () => {
  const tpl = '<html lang="en"><head><title>x</title><meta name="description" content="x" /></head><body><!--SSR-->a<!--/SSR--></body></html>';
  const out = fillTemplate(tpl, { locale: 'zh', title: 't', description: 'd', canonical: 'https://kiraresearch.com/zh/x', content: 'c', ld: [] });
  assert.equal(parse(out).length, 1);
  assert.match(out, /研究东南亚/);
});

test('static pages (home, about, methodology x 4) carry the current Organization block once', () => {
  for (const { loc, file } of files()) {
    const html = readFileSync(file, 'utf8');
    assert.equal(withOrgLd(html, loc), html, `run: node scripts/sync-org-ld.mjs (${file.pathname})`);
    assert.equal(parse(html).length, 1, file.pathname);
    assert.equal((html.match(/"@type": ?"Organization"/g) || []).length, 1, file.pathname);
  }
});

test('about pages mention the sister company with a plain link, no ownership wording', () => {
  for (const l of ['en', 'ja', 'ko', 'zh']) {
    const html = readFileSync(new URL(`../public/${l}/about.html`, import.meta.url), 'utf8');
    assert.ok(html.includes('<a href="https://bizdirectasia.com" rel="noopener">BizDirect Asia</a>'));
    const loc = JSON.parse(readFileSync(new URL(`../public/locales/${l}.json`, import.meta.url), 'utf8'));
    assert.ok(loc.about.sisterBody.includes('<a href="https://bizdirectasia.com" rel="noopener">BizDirect Asia</a>'));
  }
});
