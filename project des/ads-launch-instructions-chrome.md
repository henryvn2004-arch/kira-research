# Hướng dẫn cho Claude in Chrome: bật Google Ads thử cho KIRA + hồ sơ ngoài

Dán toàn bộ phần dưới vạch kẻ vào Claude in Chrome. Trước khi dán, anh phải đang đăng nhập sẵn trong trình duyệt này vào: tài khoản admin của kiraresearch.com, Google (`hello@kiraresearch.com`, có quyền GA4), LinkedIn, Crunchbase.

Những việc Chrome **không làm**, anh tự làm (Chrome sẽ dừng và nhắc đúng chỗ):
- Nhập thẻ thanh toán (Google Ads billing, mua thử transcript).
- Bấm **Enable** cho chiến dịch (lúc bắt đầu tiêu tiền). Chrome chỉ bật khi anh gõ đúng câu xác nhận trong chat.
- Chọn cách sửa mốc "BizDirect Asia becomes KIRA Research" trên trang About (việc này nói với session code, không phải Chrome).

Làm **sau** `project des/stage0-owner-steps-chrome.md` (env `GUEST_ACCESS_SECRET`, PayPal): thiếu bước đó thì khách không mua được, quảng cáo phí tiền.

Nguồn: `project des/ads_launch_founder_steps.md` (bản đầy đủ cho người).

---

You are helping me (the owner of kiraresearch.com and bizdirectasia.com, two sister companies) launch a small, paused Google Ads test for kiraresearch.com and create a few public company profiles. Do the parts in order. After each step, tell me in one or two lines what you did and what you saw.

## Ground rules

- **Money:** never enter, change or confirm payment details, never buy anything, never start a paid plan or trial, never accept a promotional credit offer that needs a card. When a page asks for payment details, **stop and tell me**; I will do it myself and tell you to continue.
- **Never enable (turn on) any campaign, ad group, keyword or ad** unless I type in this chat exactly: `ENABLE KIRA ADS`. Until then everything stays **Paused**.
- Never show or paste a password, token, cookie, API key or card number in this chat.
- Do not create new Google accounts. Use the accounts already logged in. If a login is missing, stop and tell me which one.
- Do not delete or change anything that already exists (accounts, properties, campaigns, settings you were not asked to change). If something with the same name already exists, leave it and tell me.
- If a screen does not match what a step describes, stop and tell me what you see. Google changes its screens often: if a button has a slightly different name, use the obvious equivalent and say so.
- Write company descriptions only from the "Facts" below. Do not invent numbers, founding years, team size, addresses or claims.
- In KIRA texts never use the words "AI", "platform", "Claude", "McKinsey" or competitor names. KIRA is "a research house".

## Facts

- KIRA Research: https://kiraresearch.com. Market research reports, expert interview transcripts and market maps (company lists by segment) for Southeast Asia, Japan, South Korea, Taiwan, Australia and New Zealand. Every figure has a source. Executive summaries are free to read. Contact: `hello@kiraresearch.com`.
- BizDirect Asia: https://bizdirectasia.com. Company database of distributors, importers, wholesalers and manufacturers in 16 Asian markets, built from each company's own website. Sister company of KIRA Research.
- Admin pages (I am logged in as admin): `https://kiraresearch.com/en/admin/config`, `https://kiraresearch.com/en/admin/funnel`.
- GA4 property for kiraresearch.com: measurement ID `G-N1891GBDCB`.
- Test budget: **$9 per day** (≈ $270 per month), 4 weeks. Locations: Japan, South Korea, Singapore, Taiwan, Australia, United States. Language: English. **No UK, no EU countries** (the site has no cookie consent banner yet).

## Part A. Turn on checkout on kiraresearch.com

1. Open `https://kiraresearch.com/en/terms` and tell me in 2 lines whether the page loads and has a refund section.
2. Open `https://kiraresearch.com/en/admin/config`, section **Checkout**. Tell me the current value of each checkout switch (names and on/off only).
3. Turn **on** `checkout.single_report_enabled` and `checkout.transcript_enabled`. Do **not** touch `checkout.subscription_enabled`, `checkout.annual_enabled` or any other setting. Save.
4. Open `https://kiraresearch.com/api/checkout-status` and tell me what it shows.
5. Open the cheapest published transcript in `https://kiraresearch.com/en/experts/transcripts/`, check that a buy button with a price shows. **Do not click buy.** Tell me the URL and price. I will make one test purchase myself and then tell you "test purchase done".

## Part B. Google Ads manager account (MCC) and the KIRA account

1. Go to `https://ads.google.com/home/tools/manager-accounts/` → **Create a manager account**. Name: `KIRA/BizDirect MCC`. Use the logged-in Google account. Country: as the form defaults (tell me which), time zone: `(GMT+07:00) Bangkok/Hanoi` if offered, currency: **USD**. If it asks for payment, stop.
2. Inside the MCC: **Accounts → + → Create new account**. Name: `KIRA Research`, currency **USD** (cannot be changed later), same time zone. Do not create a BizDirect account yet.
3. Google will try to make you create a campaign through a wizard ("Smart campaign", "What's your main advertising goal"). If you can, choose the option to **skip / switch to Expert mode / create account without a campaign**. Do not create any campaign in the wizard.
4. When billing setup appears, **stop and tell me**. I will add the card and set the monthly limit myself.

## Part C. Link GA4 and set conversions (after I tell you billing is done)

1. In the KIRA Research Ads account: **Admin → Linked accounts → Google Analytics (GA4) & Firebase** → find the property with measurement ID `G-N1891GBDCB` → **Link**, with "Import app and web metrics" on.
2. **Admin → Account settings → Auto-tagging** → on (Yes). Save.
3. In GA4 (analytics.google.com, the same property): **Admin → Events**. Tell me whether `purchase` and `generate_lead` appear. If `purchase` appears (it shows up only after my test purchase, may take up to 24 hours), click **Mark as key event** for it. Do the same for `generate_lead`.
4. Back in Google Ads: **Goals → Conversions → + New conversion action → Import → Google Analytics 4 properties → Web** → tick `purchase` → Import. Set it **Primary**, value: "Use the value from Google Analytics". Then import `generate_lead` and set it **Secondary**. If `purchase` is not available yet, import only `generate_lead` (Secondary) and tell me to remind you tomorrow.

## Part D. Download the campaign files

1. Open `https://kiraresearch.com/en/admin/funnel`, block **From Google Ads**.
2. Download only these two:
   - **Keyword campaign file for Google Ads Editor** (a file like `kira-ads-campaign-0-100.csv`).
   - **Negative keyword list (shared)** (`kira-ads-negative-keywords.txt`).
   Ignore buttons marked "Not used" (page feed, DSA).
3. Tell me the file names, their size, and the first 3 lines of the campaign CSV (open it in a browser tab or read the download). Check in the file that every Status column says **Paused**, budget says 20 and locations do not include United Kingdom or EU countries. Report what you find.

## Part E. Load the campaign into Google Ads (stays Paused)

The file is made for **Google Ads Editor**, a desktop app you cannot run. Try the web upload; if it fails, stop.

1. In the KIRA Research Ads account: **Tools → Bulk actions → Uploads** → **+** → upload the campaign CSV → **Preview** (not Apply).
2. Tell me the preview result: number of changes, errors and warnings (copy the first 5 error lines exactly). If there are errors, **stop here** and tell me; do not apply. I will import it with Google Ads Editor on my computer instead.
3. If the preview has no errors: **Apply**. Then open the new campaign and check: Status **Paused**; ad groups Paused.
4. Campaign **Settings**:
   - Budget: change to **$9.00 per day**.
   - Locations: exactly Japan, South Korea, Singapore, Taiwan, Australia, United States. **Location options → Presence: people in or regularly in your included locations** (not "Presence or interest").
   - Languages: English.
   - Networks: untick **Search partners** and **Display Network**.
   - Bidding: Manual CPC (keep the file's value). If Google forces a different strategy, tell me which.
   - If an "AI Max", "Final URL expansion" or "automatically created assets" option is on, turn it **off** and tell me.
   Save.
5. **Tools → Shared library → Negative keyword lists → + →** name `KIRA negatives`, paste the content of the negatives txt file **without** the lines that start with `#` → Save → **Apply to campaign** (the new campaign).
6. Tell me: campaign name, status, daily budget, locations, number of ad groups, number of keywords, and that everything is Paused.
7. Stop here. Write: "Ready. Type ENABLE KIRA ADS to turn it on." Only if I type exactly that: enable the campaign, then enable the first **20 ad groups** in the list (their keywords and ads too if they are paused separately), and tell me the time you did it.

## Part F. Public company profiles (for the Organization `sameAs` on both sites)

1. **LinkedIn company pages.** Go to `https://www.linkedin.com/company/setup/new/` → Company. Create one page for each, unless a page with that name already exists (search first; if it exists, give me its URL and do not create a duplicate):
   - Name `KIRA Research`, URL `linkedin.com/company/kira-research` (or the closest free one), website `https://kiraresearch.com`, industry "Market Research", size: leave the smallest option unless I tell you otherwise, type "Privately held", tagline: "Market research on Asian markets. Every figure has a source."
   - Name `BizDirect Asia`, website `https://bizdirectasia.com`, industry "Information Services" (or the closest), type "Privately held", tagline: "Company database of distributors, importers and manufacturers in 16 Asian markets."
   Logos: skip if you cannot upload a file; tell me. If LinkedIn asks to verify the page with a work email or ID, stop and tell me.
2. **Crunchbase.** At `https://www.crunchbase.com`, search for both names. If a profile exists, give me its URL. If not, use "Add a company" (free) with the facts above only. If it asks for payment or a paid plan, stop.
3. **Wikidata: do not create.** Just search `https://www.wikidata.org` for "KIRA Research" and "BizDirect Asia" and tell me whether items exist (URL if yes).
4. Finish with a list I can paste to my coding session, exactly like this:
   ```
   KIRA sameAs:
   - <LinkedIn URL>
   - <Crunchbase URL or none>
   - <Wikidata URL or none>
   BizDirect sameAs:
   - <LinkedIn URL>
   - <Crunchbase URL or none>
   - <Wikidata URL or none>
   ```

## Final report

At the end, give me one short list: what is done, what is waiting for me (card, test purchase, typing ENABLE KIRA ADS, importing with Ads Editor if the web upload failed), and anything that looked wrong.
