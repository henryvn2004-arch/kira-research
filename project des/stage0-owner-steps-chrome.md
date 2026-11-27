# Instructions for Claude in Chrome: stage 0 checkout setup for kiraresearch.com (2026-11-27)

Paste everything below the line into Claude in Chrome. I must already be logged in, in this browser, to Vercel, Supabase, PayPal and Gmail (the accounts I use for kiraresearch.com). Do the parts in order. After each part, tell me in one or two lines what you did and what you saw.

---

You are helping me prepare the new checkout of my website https://kiraresearch.com (buyers can now pay without creating an account). You will: (A) add one environment variable on Vercel and redeploy, (B) add a redirect URL in Supabase Auth, (C) check one PayPal setting, (D) write (not send) an email draft to Paddle in Gmail.

## Ground rules

- **Never show a secret value** in this chat, in a screenshot description or anywhere else. In Part A you make up a random secret: type it into Vercel only and do not repeat it to me.
- Do not delete or change anything that already exists (no existing variable, URL, setting or email). If something with the same name already exists, leave it and tell me.
- Do not buy anything, start a trial, upgrade a plan, enter card or bank details, or change my PayPal account type. If a page asks for payment, an ID card, a phone number I have not already given, or any identity check, **stop and tell me**.
- Do not send any email. Part D only creates a draft.
- If a screen does not match what a step describes, stop and tell me what you see.

## Facts

- Site: `https://kiraresearch.com`.
- Vercel project: `kira-research` (same team as `bizdirectasia`).
- Supabase project: **Kira Research** (not `bizdirectasia`, not `checkduan`, not `Tử Vi Minh Bảo`).
- The site's sign-in page is `https://kiraresearch.com/auth.html` (the browser may show it as `/auth`).

## Part A. Vercel: GUEST_ACCESS_SECRET

1. Open vercel.com → project `kira-research` → Settings → Environment Variables.
2. Check whether a variable named `GUEST_ACCESS_SECRET` exists. If it exists, do nothing in this part and tell me.
3. If not, add it: Key `GUEST_ACCESS_SECRET`; Value = a random string of 48 characters made of letters and digits (make one up, do not show it to me); Environments = **Production** and **Preview**. Save.
4. Go to Deployments, open the most recent **Production** deployment, menu (⋯) → **Redeploy** (keep "use existing build cache" as offered). Tell me when it shows Ready.

## Part B. Supabase: redirect URLs for sign-in links

1. Open supabase.com → project **Kira Research** → Authentication → URL Configuration.
2. Tell me the current Site URL and the list of Redirect URLs (they are not secret).
3. Under Redirect URLs, add these two if they are not already in the list (one at a time, Save after each):
   - `https://kiraresearch.com/auth.html**`
   - `https://kiraresearch.com/auth**`
4. Do not change the Site URL or remove any existing entry.

## Part C. PayPal: allow card payment without a PayPal account

1. Open paypal.com and sign in (already logged in). Tell me whether the account is **Business** or **Personal** (shown in the account settings). Do not change it.
2. If Business: go to Account Settings → **Website payments** → **Website preferences** → Update. Find **"PayPal account optional"** and tell me whether it is On or Off. If Off, set it to **On** and save.
3. If the account is Personal, or the setting cannot be found, stop and tell me what you see (do not upgrade the account).

## Part D. Gmail: draft a question to Paddle (do NOT send)

1. Open Gmail with the account hello@kiraresearch.com if available (else the account already open), compose a new email, and leave it as a **draft**.
2. To: `sellers@paddle.com`
3. Subject: `Pre-sales question: individual seller in Vietnam, digital research reports`
4. Body (copy exactly):

```
Hello Paddle team,

I run KIRA Research (kiraresearch.com), a small research house that sells digital market research reports (PDF and online), company lists (Excel) and expert-interview style transcripts about Asian markets. Typical prices are USD 14-78 per item, one-off purchases only (no subscriptions for now). Buyers are businesses and individuals worldwide, many in Japan and Korea.

Before I apply, could you confirm:
1. Can I sign up as an individual (sole trader) resident in Vietnam? I do not have a company yet; I plan to set one up in Singapore later and move the account to it.
2. Are digital research reports and company-level business lists (no personal data) an accepted product category?
3. Which payout methods work for a Vietnam resident (bank wire to a Vietnamese bank, Payoneer, other)?
4. Do your invoices let B2B buyers add their company name and tax ID, and can buyers in Japan receive an invoice in a form usable for their accounting?
5. Is JCB available, and any local methods for Japan and Korea?

Thank you,
Henry
KIRA Research
```

5. Save the draft and tell me it is saved. Do not send it.

## When you are done

Give me a short summary: Part A (added / already existed, redeploy Ready?), Part B (URLs added), Part C (account type, setting on/off), Part D (draft saved).

---

## Not for Chrome (I do these myself)

- **Live test purchase** after the pull request is merged: open a transcript page in a private browser window, buy it as a guest with my own card, check it opens at once and that the receipt email arrives with a sign-in link. Then refund it in PayPal (Activity → the payment → Refund).
- **Lawyer**: read the Refunds section of https://kiraresearch.com/en/terms once the new version is live.
