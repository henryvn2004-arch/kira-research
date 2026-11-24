# Instructions for Claude in Chrome: set up search engines for kiraresearch.com

Paste everything below the line into Claude in Chrome. I must already be logged in, in this browser, to Vercel, Google (Search Console), Microsoft (Bing Webmaster) and Naver. These are the SAME accounts I already use for bizdirectasia.com (one Google account can own many Search Console properties, Bing can import from Search Console, Naver Search Advisor holds many sites). Do the parts in order, and tell me in one or two lines after each step what you did and what you saw.

---

You are helping me get my website https://kiraresearch.com found by search engines. The site is already live and has a sitemap at https://kiraresearch.com/sitemap.xml (it lists the per-language sitemaps `sitemap-en.xml`, `sitemap-ja.xml`, `sitemap-ko.xml`, `sitemap-zh.xml` and `sitemap-market-maps.xml`). You will: (A) set environment variables on Vercel, (B) check/verify the site in Google Search Console and submit the sitemap, (C) do the same in Bing Webmaster Tools, (D) do the same in Naver Search Advisor.

## Ground rules

- **Never show a secret value** in this chat. The values in this task are not secrets (an IndexNow key and a public verification code), but do not paste any other token, password or cookie anywhere.
- Do not delete or change anything that already exists: no existing DNS record, no existing Vercel variable, no existing property. If something with the same name already exists, leave it and tell me.
- Do not buy anything, start a trial, upgrade a plan, enter payment details, or create ads accounts. If a page asks for payment, a phone number I have not already given, an ID card or any identity check, **stop and tell me**.
- Do not create new Google, Microsoft or Naver accounts. Use the accounts already logged in (the ones that own the bizdirectasia.com properties). If a login is missing, stop and tell me which one.
- If a screen does not match what a step describes, stop and tell me what you see.
- Add DNS records only if the step says so, only TXT records, and only the one value the step names.

## Facts

- Site: `https://kiraresearch.com` (language versions are under `/ja`, `/ko`, `/zh`; the English pages are under `/en`).
- Vercel project: `kira-research` (look for it in the same team as `bizdirectasia`; if you cannot find it in any team I can open, stop and tell me).
- Two Google verification files already exist on the site (`/google1a552fc910acc49f.html`, `/googlef6ebe1f50f6ba8b2.html`), so a URL-prefix property for kiraresearch.com may already be verified.
- Some pages are intentionally `noindex` (admin, filtered or paged views). This is on purpose: do not try to "fix" it.

## Part A. Vercel: environment variables

1. Open vercel.com → project `kira-research` → Settings → Environment Variables.
2. List the variable names that exist (names only). Tell me whether `INDEXNOW_KEY` and `NAVER_SITE_VERIFICATION` exist.
3. If `INDEXNOW_KEY` does not exist, add it: Key `INDEXNOW_KEY`, Value = a random string of exactly 32 characters made only of the digits 0-9 and lowercase letters a-f (make one up; it is not a secret and I do not need to see it again), Environment = **Production only**. Save.
4. Do **not** add `NAVER_SITE_VERIFICATION` yet (Part D does it).
5. Go to Deployments → the latest **Production** deployment → ⋯ → **Redeploy** (keep "use existing build cache" on). Wait until it shows Ready.
6. Open `https://kiraresearch.com/indexnow.txt` in a new tab. It must show exactly the 32 characters you saved. If it shows "Not found", wait a minute and reload once. Tell me the result (yes it matches / no; do not print it).

## Part B. Google Search Console

1. Go to https://search.google.com/search-console and open the property selector. List the properties whose name contains `kiraresearch.com` and say for each whether it is a **Domain** property (`sc-domain:kiraresearch.com`) or a **URL prefix** property (`https://kiraresearch.com/`, `https://www.kiraresearch.com/`).
2. If a **Domain** property already exists and is verified, skip to step 6. If only URL-prefix properties exist, continue: they stay, we add a Domain property next to them.
3. Click **Add property** → **Domain** (left card) → enter `kiraresearch.com` → Continue. Google shows a TXT record value starting with `google-site-verification=`. Copy it.
4. Find where the DNS of `kiraresearch.com` is managed: Vercel → the team's Domains page → `kiraresearch.com`.
   - If the domain uses Vercel nameservers: DNS Records → add a record: Type **TXT**, Name **@** (leave empty if the form says so), Value = the full string from Google → Save.
   - If Vercel says the nameservers are elsewhere (a registrar such as GoDaddy, Namecheap, Cloudflare, Google Domains), **stop and tell me which provider**, do not log in anywhere new.
5. Back in Search Console click **Verify**. DNS can take a few minutes: if it fails, wait 3 minutes and try again, up to 4 times. If it still fails, stop and tell me.
6. Open the verified Domain property (or, if you could not create one and a URL-prefix `https://kiraresearch.com/` property is verified, use that and tell me). **Sitemaps** (left menu) → in "Add a new sitemap" type `sitemap.xml` → Submit. Tell me the status shown (Success, or an error and its text). If the sitemap is already listed, leave it and tell me its status and the discovered-pages count.
7. Open **Security & Manual actions** → **Manual actions** and **Security issues**. Tell me exactly what each says.
8. Open **Removals**. Tell me whether there are any active removal requests. Do not create or cancel any.
9. In the top search box ("Inspect any URL") paste each of these, wait for the result, and click **Request indexing** only if the page offers it and says "URL is not on Google". Report what each says:
   - `https://kiraresearch.com/en/`
   - `https://kiraresearch.com/en/library`
   - `https://kiraresearch.com/en/market-maps`
   Do not request indexing for more than these three.

## Part C. Bing Webmaster Tools

1. Go to https://www.bing.com/webmasters and sign in with the Microsoft account that is already logged in.
2. If `https://kiraresearch.com/` is already in the site list, skip to step 4. Otherwise choose **Import from Google Search Console**, allow access for the Google account that owns the property from Part B, then select `kiraresearch.com` and import. Do not add any other site (bizdirectasia.com is already there or handled separately).
3. Confirm the site now appears in the list.
4. Open the site → **Sitemaps**. Confirm `https://kiraresearch.com/sitemap.xml` is listed (the import usually adds it). If it is not, add it. Tell me the status.
5. Open **Settings → IndexNow** if it shows. Do not generate or change keys there. Just tell me whether it shows anything.

## Part D. Naver Search Advisor

1. Go to https://searchadvisor.naver.com and sign in with the Naver account that is already logged in (the one that holds bizdirectasia.com). If it asks for a real-name check, phone number or terms I have not accepted, stop and tell me.
2. Choose **웹마스터 도구** → **사이트 등록** (register site). Enter `https://kiraresearch.com` → register. (If it is already registered and verified, skip to step 7.)
3. In the ownership step, choose **HTML 태그** (HTML tag). Naver shows a tag like `<meta name="naver-site-verification" content="XXXXXXXX" />`. Copy only the part inside `content="…"`. Do not click "소유확인" (verify) yet. Do NOT use the "HTML 파일" (file) method: this site supports only the tag.
4. Go to Vercel → project `kira-research` → Settings → Environment Variables → add: Key `NAVER_SITE_VERIFICATION`, Value = that content string, Environment **Production only**. Save. (Only letters, digits, `_` and `-`, 8-128 characters are accepted by the site; Naver's code fits.)
5. Redeploy the latest Production deployment (Deployments → ⋯ → Redeploy) and wait until Ready.
6. Check that the tag is live: open `https://kiraresearch.com/`, view page source (Ctrl+U) and look for `naver-site-verification` in the `<head>`. The page redirects to `/en/` very quickly, so use view-source (`view-source:https://kiraresearch.com/`), not the rendered page. If the tag is not there after a minute, reload once, and if still missing, stop and tell me.
7. Back in Naver, click **소유확인** (verify). When done, go to **요청** → **사이트맵 제출** and submit `https://kiraresearch.com/sitemap.xml`. Tell me the status.
8. Do not use any other Naver feature (RSS, 웹 페이지 수집 requests) unless Naver forces it. If it does, tell me first.

## Final report

Give me a short list, one line each:
- Part A: `INDEXNOW_KEY` added or already there; `/indexnow.txt` matches yes/no.
- Part B: which properties existed (Domain / URL prefix); Domain property verified yes/no (and DNS provider); sitemap status; Manual actions and Security issues text; Removals; the three URL inspections.
- Part C: site already there or imported; sitemap status.
- Part D: `NAVER_SITE_VERIFICATION` added; tag visible in page source yes/no; verified yes/no; sitemap submitted yes/no.
- Anything you skipped or that needs me.
