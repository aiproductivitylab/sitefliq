# Sitefliq — Subscription Agency Toolkit Plan

**Status:** Planning only. No feature code written yet.
**Author:** Claude + Stefan. Created: 2026-09-30. Last updated: 2026-09-30 (build order v2).
**Builds on:** [`TASK6-PLAN.md`](../TASK6-PLAN.md) (AI chat editing) and the current
codebase (Paddle one-time credits, Supabase auth/credits, `/api/*` serverless
functions on Vercel, Netlify publish).

> **Goal:** Turn Sitefliq from a one-off "generate a landing page" tool into a
> monthly subscription **agency toolkit** — find leads, score their sites,
> rebuild them with AI, edit by chat, share client previews, connect custom
> domains, and invoice. Positioned against sitedrop.ai but with a real
> generation engine and honest, cost-aware credit economics.

---

## 0. Where we are today (verified from the code)

| Capability | Status | Where |
|---|---|---|
| Auth (email/password) | ✅ | `src/store.js` `sb` helper → Supabase `/auth/v1` |
| Integer credit balance | ✅ | Supabase `credits` table, `deduct_credit` / `add_credits` RPCs |
| One-time credit packs | ✅ | Paddle **production**, price IDs in `src/App.jsx` PLANS |
| Purchase → credits webhook | ✅ (just hardened) | `api/paddle-webhook.js` — signature-verified, idempotent |
| Page generation (Sonnet 4.6) | ✅ | `api/generate.js` proxy + `GeneratingScreen` |
| Stock images (Pexels) | ✅ | `api/images.js` |
| Website importer (branding) | ✅ | `api/scrape-website.js` + `WebsiteImporter` |
| Publish to Netlify | ✅ | `api/publish.js` (creates a site per publish under `NETLIFY_TOKEN`) |
| Contact-form email (Resend) | ✅ | `api/send-contact.js` |
| AI chat editing | 📄 planned | `TASK6-PLAN.md` |

**Key architectural facts this plan reuses:**
- `/api/generate` is a **generation-agnostic** Anthropic proxy — reusable for
  chat edits and one-click rebuilds with no backend change.
- The credit system is **integer-only** today (`deduct_credit` removes exactly 1).
  A variable-cost model (generation = 4, edit = 1, lead search = 2) needs a
  generalized `deduct_credits(p_amount)` RPC — see §2.
- The Netlify publish already mints a live HTTPS site per page. Custom domains
  (§F8) extend the same token/flow.

---

## 1. Cost model — what a generation and an edit actually cost us

All downstream credit pricing is anchored to real Anthropic token cost.
Pricing used: **Sonnet 4.6 = $3 / 1M input, $15 / 1M output. Haiku 4.5 = $1 / 1M
input, $5 / 1M output.** (Sonnet 5 is $3/$15, or $2/$10 intro through
2026-08-31 — a possible future swap; see Health Check notes.)

Token estimates from the current prompt + `max_tokens: 24000`:

| Operation | Model | Input tokens | Output tokens | **Typical cost** | **Worst-case cost** |
|---|---|---|---|---|---|
| Full page generation | Sonnet 4.6 | ~4k (prompt) | 10k typ / 24k max | **$0.16** | **$0.37** |
| **Chat edit (targeted search/replace)** | **Sonnet 4.6** | ~13k (page resent to locate anchors) | **~0.2–2k (only the changed strings)** | **$0.05** | **$0.07** |
| Chat edit (full rewrite — *rejected*) | Sonnet 4.6 | ~12.5k | 10k typ / 24k max | $0.19 | $0.40 |

**Critical, non-obvious finding:** a *full-rewrite* chat edit is **as expensive as
a full generation** on the same model, because it resends the entire page as
input *and* regenerates the whole document as output. **We avoid this with
targeted search/replace edits:** the model returns only the changed strings, so
the expensive half (output tokens) stays tiny — a Sonnet edit lands at ~$0.05
even though both generation and editing run on Sonnet. (This is also why
full-rewrite editing is rejected: cost *and* fragility.) So this plan uses
**generation on Sonnet, and edits on Sonnet as small targeted search/replace
diffs** — see §F3.

---

## 2. Recommended credit economics

**Define 1 credit = 1 chat edit** (the smallest unit), then price everything
relative to real cost.

| Action | Credits | Real API cost | Cost per credit (worst) |
|---|---|---|---|
| Full page generation (Sonnet) | **4** | $0.16–0.37 | $0.093 |
| Chat edit (targeted, Sonnet) | **1** | $0.05–0.07 | $0.07 |
| One-click rebuild (= a generation) | **4** | $0.16–0.37 | $0.093 |
| Website quality score (PageSpeed) | **0** (free) | $0.00 | — |

Generation = 4 credits because it genuinely costs ~4–7× a targeted edit — the
ratio is cost-honest, not arbitrary. **Lead searches are NOT credit-priced** —
they're a separate monthly quota per tier (see the tiers table and the margin
tables below), because their cost is external (Google) and still PROVISIONAL.

### Subscription tiers (monthly, recurring in Paddle)

Matches sitedrop.ai pricing. Marketed as **"X websites per month"** (1 website =
1 generation = 4 credits), with credits as the underlying unit so edits also draw
from the same pool. Lead searches are a **separate** monthly quota (see below).

| Tier | Price | Credits/mo | Marketed as | Lead searches/mo (50 results, PROVISIONAL) | $/credit |
|---|---|---|---|---|---|
| **Starter** | $25/mo | 100 | **25 websites/month** | 5 | $0.25 |
| **Pro** | $50/mo | 200 | **50 websites/month** | 25 | $0.25 |
| **Business** | $100/mo | 500 | **125 websites/month** | 100 | $0.20 |

### Margin tables

**Confirmed (credits only).** Worst case assumes a user spends *every* credit on
generations at the max token cost ($0.37); typical assumes all generations at the
typical cost ($0.16). Spending credits on edits instead only *improves* margin (an
edit is ~$0.05 for 1 credit vs $0.093/credit for a generation), so all-generations
is the true floor.

| Tier | Price | Credits | Websites (=cr/4) | Typical cost | Typical margin | Worst cost | Worst margin |
|---|---|---|---|---|---|---|---|
| Starter | $25 | 100 | 25 | $4.00 | **84%** | $9.25 | **63%** |
| Pro | $50 | 200 | 50 | $8.00 | **84%** | $18.50 | **63%** |
| Business | $100 | 500 | 125 | $20.00 | **80%** | $46.25 | **54%** |

**AI hero image add-on (Step 3):** an AI-generated hero adds **~$0.10/generation**
(Nano Banana 2 @2K) to **~$0.13** (Nano Banana Pro @2K). At 4 credits this cuts the
Business worst-case margin from 54% to ~41%, so the recommendation is to charge it
as a **+1 credit option** (5-credit generation with AI hero, 4 with Pexels) — full
model IDs, prices, branding/fallback, and the "full AI imagery" premium are under
Step 3.

**Lead searches (PROVISIONAL — must verify before building F5).** Lead searches
are a separate monthly quota (not drawn from credits): Starter 5 / Pro 25 /
Business 100, at 50 results each. The real Google Places cost per 50-result search
is **not yet verified** and depends heavily on implementation:

- Field-masked Text Search (contact fields returned in the search response, ~3
  paginated requests for 50 results): **~$0.10–0.15/search** — cheap.
- Place-Details-per-result (one detail call per business): **~$0.85–0.95/search** — expensive.

**Break-even lead cost per search** (the most we can pay before that tier loses
money, at worst-case credit usage):

| Tier | Budget left for leads (rev − worst credit cost) | ÷ searches | **Break-even / search** |
|---|---|---|---|
| Starter | $25 − $9.25 = $15.75 | 5 | **$3.15** |
| Pro | $50 − $18.50 = $31.50 | 25 | **$1.26** |
| Business | $100 − $46.25 = $53.75 | 100 | **$0.54** |

**Business is the binding constraint: the verified 50-result Places cost must stay
under ~$0.54/search**, or a maxed-out Business user loses us money. The cheap
field-masked approach ($0.10–0.15) clears this comfortably; the expensive
per-result approach ($0.85–0.95) does NOT — at ~$0.90/search a Business user maxing
both credits and leads costs ~$136 against $100 revenue. **Before F5 ships: verify
the real cost, implement field-masked Text Search (not per-result Place Details),
and cap results, so Business cannot lose money.** This is why the lead limits are
marked PROVISIONAL.

Combined worst case at the cheap provisional ($0.15/search): Starter ~60% / Pro
~55% / Business ~39% margin — all safe. At the expensive provisional, Business goes
negative — hence the gate above.

**Why edits don't lose money:** targeted search/replace keeps edit **output** tiny
(the expensive half), so a Sonnet edit is ~$0.05 — 1 credit covers it with large
margin, no cheaper model needed. (A full-rewrite edit on Sonnet *would* have lost
money: 500 credits × $0.40 = $200 vs $100 — which is exactly why we reject it.)

### One-time top-up packs (keep existing, rescale to the new unit)

The current packs price 1 credit ≈ 1 page. Under the new finer unit (1 page = 4
credits), restate them so a pack still buys the same number of pages:

| Pack | Price | Old credits | **New credits** (÷ page = 4) | $/credit |
|---|---|---|---|---|
| Starter pack | $19 | 3 | **12** | $1.58 |
| Pro pack | $49 | 10 | **40** | $1.23 |
| Agency pack | $99 | 25 | **100** | $0.99 |

Top-ups stay deliberately pricier per credit than subscriptions (that's the
upsell to subscribe). **Migration note:** existing users' balances are in the old
unit — multiply stored balances ×4 in a one-off migration when the new unit ships,
or version the unit. Flag before launch.

### Schema/RPC change required for variable costs

- Generalize `deduct_credit` → **`deduct_credits(p_user_id, p_amount)`** with an
  atomic balance-check (reject if `balance < p_amount`). Today's RPC only removes 1.
- Add a **`credit_ledger`** table (append-only) for auditing every debit/credit:
  `id, user_id, delta, reason ('generation'|'edit'|'lead_search'|'topup'|'subscription_refill'), ref_id, created_at`.
  Makes "why is my balance X?" answerable and disputes traceable.

---

## Feature specifications

Each: plain English · Supabase tables/columns · API routes · monthly cost to me · what could go wrong.

---

### F1. Monthly subscriptions in Paddle (+ keep one-time top-ups)

**What it does (plain English):** Users pick Starter/Pro/Business and are billed
monthly by Paddle. Each successful monthly charge refills their credit balance to
that plan's allotment. Marketed as **"X websites per month."** They cancel or
change plans through Paddle's hosted customer portal (no billing UI for us to
build). One-time packs remain as "running low? top up" purchases on top of a
subscription.

**Supabase:**
- New **`subscriptions`** table: `user_id (fk), paddle_subscription_id, paddle_customer_id, plan ('starter'|'pro'|'business'), status ('active'|'past_due'|'canceled'), monthly_credits (int), current_period_end (timestamptz), created_at, updated_at`.
- `credits` table: unchanged shape; balance is **set** to `monthly_credits` on each renewal (use-it-or-lose-it) — or add with a 2× cap if you prefer rollover (decide before build).
- `credit_ledger`: log each refill.

**API routes:**
- Extend **`api/paddle-webhook.js`** to handle `subscription.created`,
  `subscription.updated`, `subscription.canceled`, and recurring
  `transaction.completed` where the transaction belongs to a subscription
  (refill), vs a one-time pack (add). Distinguish by price ID (map subscription
  price IDs separately) and/or `data.subscription_id` presence.
- New **`GET /api/portal`** → returns the Paddle-hosted management URL for the
  signed-in customer (from `paddle_customer_id`) so "Manage subscription" just
  redirects.

**Monthly cost to me:** Paddle fees ≈ **5% + $0.50 per transaction** (Merchant of
Record). Net per active sub: Starter ~$23.25, Pro ~$47, Business ~$94.50. No fixed
platform fee. Supabase still free-tier at low volume.

**What could go wrong:**
- **Refill vs top-up confusion in the webhook** — if a subscription renewal is
  mistaken for a pack (or vice-versa), balances get set instead of added or
  double-counted. Must branch cleanly on subscription vs one-time price IDs.
- **`past_due` / failed payment** — don't refill on a failed charge; downgrade
  access when `status != active`. Handle dunning (Paddle retries).
- **Proration on plan change** — Paddle prorates; decide whether an upgrade
  mid-cycle refills immediately (recommend: top up the difference, log it).
- **Migration of existing pack-based balances** to the new credit unit (×4).

---

### F2. Credit costs enforced per action

**What it does:** Every AI action debits the right number of credits atomically,
and refuses when the balance is too low — so heavy users can't run us negative.

**Supabase:** `deduct_credits(p_user_id, p_amount)` RPC (§2), `credit_ledger`.

**API routes:** No new route — deduction happens server-side. **Important:** today
credit deduction runs **client-side** (`sb.deductCredit()` in `App.jsx`). That's
spoofable. As part of this work, move deduction **behind the server**: `/api/generate`
(and a new `/api/edit`) should verify the user's Supabase token, call
`deduct_credits` server-side, and only then call Anthropic. (Larger refactor —
call out explicitly; it's a security fix, not just a feature.)

**Monthly cost to me:** none beyond the Anthropic usage already modeled in §1.

**What could go wrong:**
- **Client-side deduction is bypassable today** — a user could call Anthropic via
  our proxy without paying. Server-side enforcement closes this.
- **Race conditions** — two concurrent requests both passing the balance check.
  The RPC must debit atomically (`update ... where balance >= amount returning`).
- **Partial failure** — debit succeeds but generation fails: refund the credits
  in the same `onError` path (ledger makes this clean).

---

### F3. AI chat editing of generated pages (Task 6)

**What it does:** On the result screen, the user types a change in plain English —
"make the hero darker", "change the phone number to 555-1234", "swap the gallery
photos" — and sees it applied **live in the preview**. Full context in
`TASK6-PLAN.md`. **This plan changes TASK6's approach in three ways:**
1. **Targeted search/replace, NOT full rewrite.** The AI returns a small set of
   exact `{ find, replace }` string edits against the current HTML, which we apply
   locally. This keeps output tokens tiny (see §1) and is the cost lever that
   makes edits cheap on Sonnet.
2. **Sonnet 4.6** (not Haiku) — quality matters for locating the right markup and
   producing correct replacements; targeted output keeps it affordable.
3. **1 credit per applied edit** (not free-and-capped).

**How the search/replace works:**
- Prompt: system instruction "You are editing an existing HTML page. Return ONLY
  a JSON array of `{find, replace}` objects where `find` is an EXACT substring of
  the current HTML to replace. Make the smallest change that satisfies the
  request. Do not restate the whole document." + the current HTML + the user's
  instruction.
- Apply each `find`→`replace` to the stored HTML **only if `find` matches exactly
  once** (ambiguous/zero matches → reject that edit, don't guess). Then
  `setGeneratedHtml(newHtml)` → preview updates itself (per TASK6 §0).
- **Undo history:** push the pre-edit HTML onto a stack before applying; "Undo"
  pops and restores. Multiple levels so a run of edits can be walked back.

**Supabase:** none for v1 (uses existing credit balance via `deduct_credits`).
Optional later: persist edit transcript per project (§F9).

**API routes:** new thin **`/api/edit`** (Sonnet, returns the search/replace JSON,
does the server-side 1-credit debit from F2). Kept separate from `/api/generate`
so generation and editing have independent, tunable cost controls.

**Monthly cost to me:** ~$0.05 per applied edit (covered by the 1-credit charge).
No fixed cost.

**What could go wrong:**
- **`find` doesn't match / matches multiple times** — apply nothing for that edit,
  tell the user "couldn't locate that element, try rephrasing", don't burn a
  credit on a no-op (refund via ledger).
- **Model returns prose or invalid JSON** — reject, keep previous HTML, refund.
- **Edit breaks the page** — undo history is the safety net; preserve-on-failure
  (TASK6 §4) still applies: never overwrite the working page until the new HTML
  validates (`<!doctype` present).
- **Over-broad `find`** (e.g. a common string like `#fff`) — instruct the model to
  choose a unique surrounding anchor; the exactly-once-match rule guards the rest.

---

### F4. Private client preview links + before/after view

**What it does:** For each generated page, the user gets a shareable private link
(`sitefliq.com/p/<token>`) to send a client. The client sees a clean preview with
an optional **before/after toggle**: their current live site (in an iframe or a
screenshot) next to the new Sitefliq page. Great for sales ("here's your site
now, here's what we'd build").

**Supabase:**
- **`projects`** table (shared with F9): `id, user_id, business_name, html (text), source_url (their old site), share_token (uuid, indexed, unique), is_public (bool), created_at, updated_at`.
- The share link resolves `share_token` → returns `html` + `source_url`.

**API routes:**
- **`GET /api/preview?token=<token>`** — public (no auth), returns the stored HTML
  + `source_url` for a valid public token; 404 otherwise.
- Frontend route `/p/:token` renders before (their `source_url` in an iframe, or a
  "site unavailable" fallback) vs after (stored HTML in an iframe).

**Monthly cost to me:** Supabase storage — each page ~50–150 KB of HTML text; 1,000
saved pages ≈ 50–150 MB (within the 500 MB free tier; Pro $25/mo when exceeded).
No per-view cost.

**What could go wrong:**
- **Their old site may block iframing** (`X-Frame-Options`/CSP) — many will. Fall
  back to a server-side screenshot (adds a screenshot API cost) or a "visit
  original ↗" link. For v1, iframe-with-fallback is fine.
- **Token guessing / leakage** — use unguessable UUID tokens; allow the owner to
  revoke (`is_public=false`). No PII beyond a business name.
- **Stale "before"** — the client's real site may change; label it "captured on X".

---

### F5. Lead Finder (Google Places API — official, not scraping) + quality score

**What it does:** User searches e.g. "dentists in Austin". We call the **official
Google Places API** and return businesses with name, address, phone, website (or
"no website"). For each, we compute a **website quality score** using the **free
Google PageSpeed Insights API**: flags for *no website, slow, not mobile-friendly,
no HTTPS*. This surfaces the best sales targets ("no site" / "slow, not mobile").

**Supabase:**
- **`leads`** table: `id, user_id, place_id (unique per user), business_name, address, phone, website_url, has_website (bool), https (bool), mobile_friendly (bool), perf_score (int 0-100), quality_flags (jsonb), searched_query, created_at`.
- Cache results by `place_id` to avoid re-paying Google for the same business.

**API routes:**
- **`POST /api/leads/search`** — body `{ query }`. Server uses field-masked Google
  Places Text Search (contact fields in the response; up to 50 results),
  decrements the user's **monthly lead-search quota** (not credits), stores/returns
  leads. **Never called from the browser directly** (key protection).
- **`POST /api/leads/score`** — body `{ website_url }`. Calls PageSpeed Insights
  (free), returns perf + HTTPS + mobile flags. Can run in the same request as
  search or lazily per lead.
- New env vars: **`GOOGLE_PLACES_KEY`**, **`GOOGLE_PAGESPEED_KEY`** (can be the
  same GCP key with both APIs enabled; keep server-side only — distinct from the
  browser `VITE_GOOGLE_KEY` used for Maps).

**Plan limits (PROVISIONAL):** lead searches are a **separate monthly quota**, not
credit-priced — Starter **5** / Pro **25** / Business **100** searches/month at
**50 results each**. These limits are PROVISIONAL and must be confirmed against the
verified Google cost (see below and the margin tables) before F5 is built, so the
Business plan can't lose money.

**Monthly cost to me (PROVISIONAL — verify before building):**
- **Google Places API (paid):** cost per 50-result search is **not yet verified**
  and depends on implementation. Two paths: **field-masked Text Search** (contact
  fields in the search response, ~3 paginated requests) ≈ **$0.10–0.15/search**;
  or **Place-Details-per-result** ≈ **$0.85–0.95/search**. Business break-even is
  **~$0.54/search** (margin tables), so F5 **must** use the field-masked approach
  and cap results. Google Maps Platform gives a monthly free allotment per SKU (the
  flat $200/mo credit was retired in 2025 — **verify current free tiers + exact
  per-request SKU pricing in the GCP console before building**).
- **PageSpeed Insights API:** **FREE** — 25,000 requests/day with a key (≈240/min
  rate limit). $0.00.

**What could go wrong:**
- **Cost blowout** — Places is real money per call. Gate behind the monthly search
  quota, cache by `place_id`, cap results per search (50), use field-masked Text
  Search (not per-result Place Details), and set a **GCP billing budget alert**.
  Verify the real per-search cost stays under the Business break-even (~$0.54)
  before shipping. A user hammering search is the single biggest cost risk.
- **PageSpeed rate limits / timeouts** — 240/min; scoring 20 sites in parallel can
  throttle. Queue/limit concurrency; score lazily on demand.
- **Field-based billing** — the new Places API charges by the *fields* requested;
  `website` is a higher tier. Request the minimum field mask.
- **Terms of service** — Places data has display/caching restrictions (e.g. limited
  caching windows). Review Google's ToS before persisting long-term.

---

### F6. One-click "rebuild this business's site" from a lead

**What it does:** From a lead row, "Rebuild their site" pre-fills the builder using
the existing website importer (pull branding/colours/logo from their current
`website_url`), then runs a normal generation. Turns a lead straight into a demo.

**Supabase:** reuses `leads` (source) and `projects` (output, §F4/F9). Optional
`leads.rebuilt_project_id` fk to link a lead to the page you built for it.

**API routes:** reuses **`/api/scrape-website`** (importer) + **`/api/generate`**.
No new route. Debits 4 credits (a generation) via F2.

**Monthly cost to me:** one generation (~$0.16–0.37) + one scrape (Pexels/HTTP,
negligible). Covered by the 4-credit charge.

**What could go wrong:**
- **Importer fails on their site** (blocked, JS-only, no metadata) — fall back to
  manual entry pre-filled with what we do have. Never dead-end.
- **No website leads** — "rebuild" should still work from just business name +
  industry (skip import). This is actually the best sales case.

---

### F7. Simple invoicing (create → PDF → mark paid)

**What it does:** User creates an invoice (client name, line items, amount),
exports a PDF, and marks it paid/unpaid. Lightweight — this is agency
bookkeeping, not a payments processor.

**Supabase:**
- **`invoices`** table: `id, user_id, client_name, client_email, line_items (jsonb), currency, subtotal, total, status ('draft'|'sent'|'paid'), issued_date, due_date, invoice_number, created_at`.

**API routes:** **none required for v1** — generate the PDF **client-side** with a
library (e.g. jsPDF) so there's no server cost or new dependency. CRUD goes
straight to Supabase via the existing `sb` helper. (Optional later: `/api/invoice/email`
to send via Resend.)

**Monthly cost to me:** $0 (client-side PDF, Supabase free tier). If emailing
invoices via Resend: free up to 3,000 emails/mo, then $20/mo.

**What could go wrong:**
- **Not a legal/tax tool** — make clear it doesn't handle tax compliance, VAT
  rules, etc. Keep it a simple document generator.
- **Invoice numbering** — needs to be unique per user and monotonic; generate
  server-side or with a per-user counter to avoid duplicates.
- **Scope creep** — resist turning this into full accounting. Create/PDF/mark-paid only.

---

### F8. Custom domain connection via Netlify API

**What it does:** After publishing, the user connects their own domain
(`www.theirbusiness.com`) to the Netlify site we created, with instructions for
the DNS records to add. SSL is automatic (Let's Encrypt via Netlify).

**Supabase:**
- Extend **`projects`**: `netlify_site_id, published_url, custom_domain, domain_status ('pending'|'verifying'|'live')`.

**API routes:**
- **`POST /api/domains/connect`** — body `{ project_id, domain }`. Calls the
  Netlify API to add the custom domain/alias to the site (reuses `NETLIFY_TOKEN`),
  returns the DNS records the user must set.
- **`GET /api/domains/status`** — polls Netlify for SSL/DNS provisioning state.

**Monthly cost to me:** Netlify custom domains + SSL are **free**. Risk is
**account-level limits**: all client sites live under one `NETLIFY_TOKEN`. Netlify
free tier caps bandwidth (100 GB/mo) and sites; heavy use pushes you to **Netlify
Pro ~$19/mo** (or per-seat team pricing). No per-domain fee.

**What could go wrong:**
- **DNS is user-controlled** — they must add records correctly; provisioning can
  take minutes to 48h. Show clear status and instructions; don't promise instant.
- **One-account blast radius** — every client site under your single token; a
  Netlify account issue affects all of them. Consider per-user Netlify sites or a
  paid team plan as you scale.
- **Domain typos / already-in-use domains** — validate and surface Netlify's error.

---

### F9. Saved projects dashboard

**What it does:** A "My Projects" screen listing every site the user has generated
(with preview thumbnail, published URL, custom domain, share link) and their saved
leads — so work persists across sessions instead of living only in the browser
store.

**Supabase:**
- **`projects`** table (the hub for F4/F6/F8): `id, user_id, business_name, industry, html, source_url, share_token, is_public, netlify_site_id, published_url, custom_domain, domain_status, created_at, updated_at`.
- Reuses **`leads`** (§F5) for the leads tab.
- **Row-Level Security** on both so users only see their own rows.

**API routes:** mostly none — CRUD via the `sb` helper with RLS. Optional
**`GET /api/projects`** if you want server-side aggregation. Saving a project =
writing the current `generatedHtml` + metadata to `projects`.

**Monthly cost to me:** Supabase storage for HTML (see F4 estimate). Free tier
until ~500 MB, then Pro $25/mo.

**What could go wrong:**
- **RLS misconfiguration** = data leak between users. Test RLS explicitly (a
  user must not read another's projects/leads/invoices via the anon key).
- **Store vs DB source of truth** — today `generatedHtml` lives in the zustand
  store (localStorage). Moving to DB-backed projects needs a clear "save"
  action/auto-save and a migration path; keep the store as a working draft, DB as
  the saved record.
- **HTML bloat** — large pages × many users grows the DB; consider moving HTML to
  Supabase Storage (object storage) instead of a text column if it grows.

---

## 3. Recommended build order (v2)

Small, independently-testable steps. Free/frontend work and security fixes come
before anything that needs paid external APIs (Google Places) or money movement
(subscriptions), which come before the remaining growth features.

> **Everything in this plan is pre-launch.** Launch happens only after **all six
> steps** — including Lead Finder, invoicing, and custom domains — are built and
> tested end-to-end. See the **Launch checklist** (§5) for the gate.

### Step 1 — API lockdown + server-side credits  *(security foundation)*
= **F2**. Add `deduct_credits(p_user_id, p_amount)` RPC + `credit_ledger` table;
move credit deduction **server-side** into `/api/generate` (verify the Supabase
token, debit, then call Anthropic; refund on failure). Closes the client-side
bypass **before** any new paid feature is exposed. Everything else depends on this
being solid, so it's first.
> Dependency: the Supabase SQL (RPC + table) must be applied in the Supabase
> project *before* the server code deploys, or generation breaks. Deploy order:
> **SQL first, then code.** Cannot be end-to-end tested without the live Supabase +
> a deploy.

### Step 2 — AI chat editing (targeted search/replace, Sonnet, undo)
= **F3**. New `/api/edit` returns `{find, replace}` diffs; apply locally with
exact-once matching; 1-credit debit via Step 1; multi-level undo history.
First visible AI feature after generation, reuses the Step 1 credit plumbing.

### Step 2.5 — Premium website redesign  *(no new infra)*
A full visual redesign of the Sitefliq app itself (not the generated pages).
Direction: formal, premium B2B SaaS in the spirit of Stripe / Linear / Mercury —
deep navy/charcoal + white, Sitefliq orange used sparingly as an accent; refined
typography, generous whitespace, clear hierarchy, subtle motion only. **No emojis
in the UI. Real product mockups of the builder instead of decorative graphics. No
invented testimonials, stats, or user counts — only true claims.**

Starts with a **reusable design system** (colours, type scale, spacing, buttons,
cards, inputs, badges) in its own module (`src/ui/theme.js` + `src/ui/kit.jsx`)
that every current and future screen must use; components move out of `App.jsx`
into their own files where it helps, with **no behaviour change**. Built in three
stages, each independently testable (build must pass; all existing functionality
preserved):

1. **Design system + homepage + pricing page.** Pricing shows the monthly
   subscriptions (Starter $25 / 25 sites, Pro $50 / 50, Business $100 / 125,
   "billed monthly, cancel anytime"), with one-time credit top-ups kept as a
   small secondary section. Subscription buttons are **not** wired to Paddle yet
   (price IDs come with Step 5); top-ups keep working via the existing flow.
2. **Builder, generating screen, result screen** (incl. chat editing + republish)
   **and auth modals.**
3. **Help, example page, legal pages.**

Slots here so every later step (quality pass, previews, subscriptions, growth
features) is built on the new design system rather than retrofitted.

### Step 3 — Generation quality pass  *(no new infra)*
Review the current `buildPrompt` and real generated output, and produce a ranked
list of concrete improvements to make pages look more **premium** and **convert
better** (typography/spacing/hierarchy, hero/CTA strength, trust/social-proof,
imagery, mobile polish, copy quality). Pure prompt/QA work — no Supabase, no new
API, no cost. Deliver the list first; apply the top items as prompt edits and
eyeball before/after. Slots here because it lifts the core product with zero
external dependency, right after editing lands.

#### Step 3 add-on — AI hero images (Google Nano Banana / Gemini)  *(plan only, not built)*

**What it does:** Replace the *hero* image only with an AI-generated scene tailored
to the business, while keeping **Pexels for gallery and section images** (hybrid —
controls cost and keeps the rest grounded in real photos). The hero is the one
image that most defines "premium," so it's where AI spend pays off.

**Verified model IDs + per-image price** (from Google's official docs
`ai.google.dev/gemini-api/docs/image-generation` + `/pricing`, checked
2026-09-30 — re-verify before building, these move fast):

| Model | ID | 2K price/image | Notes |
|---|---|---|---|
| Nano Banana 2 | `gemini-3.1-flash-image` | **$0.101** (1K $0.067, 4K $0.151) | "Generalist workhorse," **excels at text rendering**, up to 14 reference images |
| Nano Banana Pro | `gemini-3-pro-image` | **$0.134** (1K–2K flat; 4K $0.24) | "Premium," **advanced brand consistency**, reference images incl. style/character |
| Nano Banana 2 Lite | `gemini-3.1-flash-lite-image` | 1K only, $0.0336 | Cheapest; no 2K, no multi-turn edit |
| Nano Banana (legacy) | `gemini-2.5-flash-image` | $0.039 | Deprecated — don't use |

No free tier on any of them. (Batch API is 50% off but is async, so it doesn't
apply to interactive hero generation.)

**NB2 vs Pro at 2K:** NB2 is the cost/quality sweet spot ($0.101, strong text
rendering); Pro costs +$0.033 ($0.134) and is meaningfully better at **brand
consistency** — the relevant axis when we bake a logo or the business name into the
scene. **On logo + text accuracy specifically: neither is pixel-accurate.** Both
*approximate* a logo and can misspell small text; Pro is closer (it's the
brand-consistency model and accepts style reference images) but still not exact.
Conclusion: never trust an AI-baked logo as authoritative — see the fallback.

**Branding (per the brief):** pass the business's uploaded/imported logo
(`form.logo` — already captured) as a **reference image** plus the business name,
and prompt the scene to carry branding *naturally* — signage, a vehicle wrap, a
uniform patch, packaging — rather than a floating logo. Use **Pro** for this
in-scene-branding path (best fidelity); expect approximation.

**Fallback (this is the default, always-accurate path):** generate a **clean scene
with no baked-in logo or text**, then overlay the **real logo via HTML/CSS** on top
of the hero (absolute-positioned, uses the exact uploaded asset) — 100% accurate,
every time, and cheaper (NB2 clean scene, $0.101). In the builder, offer the user a
choice: **"Regenerate"** (new scene), **"Brand it in the scene"** (Pro, baked-in —
may be imperfect), and **"Use clean version"** (scene + CSS logo overlay). Default
to the clean-overlay version so accuracy is guaranteed unless the user opts in.

**Prompt rules (hard guardrails, consistent with the existing accuracy rule):**
scenes and **atmosphere only** — environments, spaces, objects, light. **Never**
generate fake staff, fake customers, or fake "completed work" (e.g. a roofer's
finished roof that isn't theirs). No posed people presented as this business's team
or clients. This is an honesty/legal guardrail, not a style preference.

**Storage (required):** AI images are uploaded to a **Supabase Storage** bucket
(e.g. `hero-images`) and referenced by **URL** in the generated HTML — **never
embedded as base64** (base64 bloats the page, breaks caching, and blows up the DB
row / published file size). The generate flow swaps the hero token (`__IMG_0__`)
for the Storage URL, exactly as it swaps Pexels URLs today.

**API + infra:** new `GEMINI_API_KEY` (server-side only); a server step (in
`/api/generate` or a small `/api/hero-image`) that calls the Gemini image API,
uploads the result to Supabase Storage, and returns the public URL. Storage cost:
a 2K JPEG/PNG ≈ 1–3 MB; 1,000 sites ≈ 1–3 GB → within Supabase free 1 GB only
briefly, so this is another nudge toward Supabase Pro ($25/mo).

**Cost + credit recommendation:** one AI hero adds **$0.101 (NB2)** to **$0.134
(Pro)** on top of the ~$0.16–0.37 Anthropic generation:

| Generation variant | Hero source | Typical total | Worst total |
|---|---|---|---|
| Base (today) | Pexels | $0.16 | $0.37 |
| + AI hero (NB2 @2K) | `gemini-3.1-flash-image` | $0.26 | $0.47 |
| + AI hero (Pro @2K) | `gemini-3-pro-image` | $0.29 | $0.50 |
| Full AI imagery (6× NB2 @2K) | all AI | $0.77 | $0.98 |

At 4 credits / generation (Step 5 pricing, Business $0.20/credit → $0.80 revenue),
an AI-hero generation's worst-case margin drops from ~54% (Pexels) to **~41%** —
still positive but a ~13-point erosion, worst at the Business tier.
**Recommendation:** make the AI hero a **+1 credit option (generation = 5 credits
when the AI hero is on; stays 4 with the Pexels hero)** rather than a silent
default. This (a) restores worst-case margin to ~53% on AI-hero generations, (b)
keeps the clean "25/50/125 websites per month" headline for the base product, and
(c) is cost-honest — users pay for the pixels they use. Implement as a builder
toggle. If you'd rather make AI hero the default look, bump the *base* generation to
5 credits instead (headline becomes 20/40/100 websites/month).

**Optional "full AI imagery" premium:** generate *all* images (hero + gallery +
sections, ~6 images) with AI instead of Pexels. Cost ≈ $0.6–1.0/site (6× NB2 @2K),
so price it as a larger add-on — **~+8 credits** (≈ a full-AI generation at ~12
credits total) to keep ~50% margin at the Business tier. Offer it as an opt-in
premium in the builder for agencies that want a fully bespoke look. Verify the
per-image price again at build time and re-tune the credit add-on.

### Step 4 — Before/after client preview links + saved projects dashboard
= **F4 + F9**. Add the `projects` table (with RLS) + `share_token`, the public
`/api/preview` + `/p/:token` route, and the "My Projects" dashboard. First
Supabase-schema step; gives users persistence and a sales tool.

### Step 5 — Paddle subscriptions (Starter $25 / Pro $50 / Business $100)
= **F1**, marketed as **"X websites per month"** (25 / 50 / 125). Create the
Paddle subscription products, extend the webhook (renewal vs top-up), add the
`subscriptions` table + `/api/portal`, rescale the top-up packs (×4), and migrate
existing balances. **Test in the Paddle sandbox first.** This turns on recurring
billing, but it is **not** launch — Step 6 must still be built and tested first.

### Step 6 — Growth features (still pre-launch)
In roughly this order (free-API and reuse first, paid/external last):
1. **Website quality score** (F5 scoring half) — PageSpeed is **free**; set up the
   GCP project + keys here on a pasted URL before touching paid Places.
2. **Lead Finder** (F5 search half) — Google Places (**paid**); gate behind the
   monthly lead-search quota, use field-masked Text Search, cache by `place_id`,
   and set a **GCP billing budget alert** before first real search.
3. **One-click rebuild from a lead** (F6) — wire lead → importer → generate → save
   as a project.
4. **Invoicing** (F7) — client-side PDF first, then persist to the `invoices` table.
5. **Custom domains via Netlify** (F8) — reuses `NETLIFY_TOKEN`; watch account
   limits; depends on published projects existing.

**Why this order:** Step 1 makes spending safe and closes the payment bypass
before anything else touches credits. Step 2 delivers the flagship post-generation
feature on top of it. Step 3 lifts perceived quality with zero cost. Step 4 makes
work persist and gives a sales artifact. Step 5 turns on recurring billing. Step 6
adds the metered-cost (Places) and account-limited (Netlify) features last, once
credits, budgets, and subscriptions are all enforced. **Launch comes after Step 6**
— every feature, including Lead Finder, invoicing, and custom domains, must be
built and tested first (see §5 Launch checklist).

---

## 4. Summary of new infrastructure

**New Supabase tables:** `subscriptions`, `projects`, `leads`, `invoices`,
`credit_ledger`. **Changed:** `credits` (refill logic), new `deduct_credits(amount)` RPC.

**New API routes:** `/api/edit` (Sonnet search/replace edits), `/api/portal`,
`/api/preview`, `/api/leads/search`, `/api/leads/score`, `/api/domains/connect`,
`/api/domains/status` (+ optional `/api/projects`, `/api/invoice/email`).
**Changed:** `api/generate.js` (server-side credit deduction + token verification),
`api/paddle-webhook.js` (subscription events).

**New env vars (server-side):** `GOOGLE_PLACES_KEY`, `GOOGLE_PAGESPEED_KEY`,
`GEMINI_API_KEY` (AI hero images, Step 3), new Paddle **subscription** price IDs +
`PADDLE_WEBHOOK_SECRET` (already added).

**Fixed monthly costs to me (recurring):** Paddle ~5%+$0.50/txn; Supabase $0 →
$25/mo (Pro, when >500 MB / higher usage); Netlify $0 → ~$19/mo (Pro, at scale);
Resend $0 → $20/mo (only if emailing invoices >3k/mo); PageSpeed **$0**.
**Variable:** Anthropic per generation (~$0.16–0.37) / edit (~$0.05); Google Places
**PROVISIONAL** per 50-result search (separate monthly quota; must be verified
under the ~$0.54 Business break-even before F5 — see margin tables). The two real
cost risks to watch: **Google Places** and, only if we ever switched edits to
full-rewrite, **Sonnet edits** — both mitigated above.

---

## 5. Launch checklist

**Nothing launches until every box below is checked.** All six build steps must be
complete, and the whole toolkit — including Lead Finder, invoicing, and custom
domains — must be verified end-to-end on the live site before any public launch.

### Feature verification (each tested end-to-end on the LIVE site)
- [ ] **Step 1 — credits/security:** generation and publish require a valid login;
      a logged-out request is rejected (401); credits deduct server-side; a
      truncated/failed generation auto-refunds; rate limits trip (5 gen / 10 publish
      per 10 min); the `credits` UPDATE-policy hole is confirmed closed
      (`security_checks.sql`); `PADDLE_WEBHOOK_SECRET` set and a Paddle test webhook
      returns 200.
- [ ] **Step 2 — chat editing:** targeted edits apply live in the preview; 1 credit
      per successful edit; a no-match/invalid edit refunds and preserves the page;
      multi-level undo works; rate limit trips.
- [ ] **Step 3 — quality pass (+ AI hero if built):** generated pages reviewed for
      premium look; if AI hero shipped — image saved to Supabase Storage (URL, not
      base64), clean-logo-overlay fallback works, +1 credit charged, prompt
      guardrails hold (no fake staff/customers/work).
- [ ] **Step 4 — previews/projects:** projects persist per user (RLS verified — a
      user cannot read another's projects/leads/invoices); private share link opens
      for a logged-out client; before/after view renders (with fallback).
- [ ] **Step 5 — subscriptions:** all three plans subscribe via Paddle; a renewal
      refills credits; a top-up pack adds credits; cancel/manage via the Paddle
      portal works; `past_due` does not refill; existing balances migrated (×4) and
      generation cost flipped to its launch value.
- [ ] **Step 6 — growth features:**
  - [ ] Website quality score returns correct flags (no site / slow / not mobile / no HTTPS).
  - [ ] **Lead Finder** — real Google Places cost per 50-result search **verified**
        under the ~$0.54 Business break-even; monthly quotas enforced; GCP budget
        alert live.
  - [ ] One-click rebuild from a lead produces a saved project.
  - [ ] **Invoicing** — create → PDF export → mark paid, persisted per user.
  - [ ] **Custom domains** — connect a real domain via Netlify, DNS instructions
        shown, SSL provisions, status reflects live.

### Money + data
- [ ] A **real (non-sandbox) subscription purchase** completed end-to-end, credits
      granted, transaction logged, and the credit appears in the ledger.
- [ ] A real top-up purchase tested the same way.
- [ ] Refund/chargeback path understood (Paddle dashboard).
- [ ] All required env vars set in Vercel **Production** (Anthropic, Pexels, Resend,
      Netlify, Supabase service key, Google keys, Gemini, Paddle secret + price IDs).
- [ ] Supabase migration applied in production; `security_checks.sql` re-run clean.

### Private beta
- [ ] **3–5 real users** run the full flow (generate → edit → publish → subscribe)
      for **one week**.
- [ ] Feedback collected; blocking bugs fixed; costs reviewed against the margin
      tables with real usage before opening to the public.
