-- 073_bizdirect_press_licence_google.sql — make the bizdirect_press licence text match what is stored:
-- the headline (English line written by the bridge, original title kept in raw), the date, the publisher's name and domain,
-- and a link to the article. The link is either the publisher's own URL ('original') or a Google News link that redirects
-- to the publisher ('google_news'); raw.bridge.url_kind tells which. No article text is stored. The domain shown is the
-- publisher's, never news.google.com. Status stays 'draft' until the Step 0.8 review. DRAFT: not applied; owner approval first.
-- Idempotent.
--
-- Rollback: run 072 again (it restores the previous wording).

update public.data_sources set
  licence = 'Headlines and links only, no article text. Each item shows the publisher name and links to the article, either directly or through a Google News link that redirects to the publisher',
  attribution = 'News found through the BizDirect Asia press monitor; each item names its publisher and links to the article',
  notes = 'Written by the BizDirect bridge as drafts (raw.bridge.url_kind = original | google_news; raw.bridge.source_name = publisher); published only after the Step 0.8 review.',
  updated_at = now()
where key = 'bizdirect_press';
