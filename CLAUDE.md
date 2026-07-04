# wpr-jobs — CLAUDE.md

Paid local job board for Wausau Pilot & Review. Public title: **Now Hiring
in Marathon County**. Revenue product: employers pay $75 (Stripe) for a
30-day posting — or $150 for a **featured** posting, front and center at
the top of the board with the red standout treatment; the newsroom
reviews every submission before it goes live.
Same submission → review → publish contract pattern as `wpr-obituaries`.

## Architecture — one correct path

```
Employer fills #/post (picks standard or featured tier)
      → Edge Function submit-job (validate, insert 'pending_payment',
        create Stripe Checkout Session with job_id in metadata;
        featured tier → STRIPE_FEATURED_PRICE_ID)
      → Employer pays on Stripe
      → Edge Function stripe-webhook (verify signature,
        flip 'pending_payment' → 'pending_review',
        best-effort "with our editors" email to the employer)
      → Admin approves (or edits, then approves) in #/admin
      → 'published', expires_at = now + 30 days
      → Admin UI invokes notify-employer ("you're live" / rejection email)
      → Visibility ends when expires_at passes (RLS policy, nothing else)
```

Frontend: React 18 + Vite → GitHub Pages (`RowanFlynnPilot/wpr-jobs`) →
WordPress iframe embed. Backend: Supabase (Postgres + RLS + Edge Functions).
Payments: Stripe Checkout, two Price objects (standard, featured).
Email: Resend via `functions/_shared/email.ts` — emails are a courtesy, the
row is the ledger; a failed send never blocks or reverts a status change.
Syndication: `jobs-feed` serves the live board as RSS/JSON (newsletter).

## Invariants — do not violate

1. **Status lifecycle is `pending_payment → pending_review → published |
   rejected`.** "Expired" is DERIVED (`published` AND `expires_at <=
   now()`), never stored. There is no cron and no reconciliation job — the
   anon RLS policy is the single mechanism that ends visibility. Takedown =
   set `expires_at = now()`.
2. **The browser never inserts.** All submissions go through `submit-job`
   with the service role. Anon has zero write policies. Admin (authenticated)
   may update only.
3. **Rows are never deleted.** No delete policy exists for any role.
   Rejection and takedown are status/expiry changes. Ledger discipline.
4. **`contact_name`, `contact_email`, `stripe_session_id`, `status`, and
   review fields are structurally invisible to the public** — enforced by
   column grants in the migration, not client discipline. Public queries
   must enumerate `PUBLIC_COLUMNS` (Board.jsx); `select('*')` from the anon
   key fails loudly by design.
5. **No status filter in the public board query.** Anon can't read the
   status column; RLS alone defines what's visible. Don't "add it back."
6. **Taxonomy lives in two places by necessity**: `src/lib/taxonomy.js`
   (frontend) mirrored in `supabase/functions/submit-job/index.ts` (Deno
   runtime). Change both or the function rejects the form.
7. **Price**: charged amounts = the Stripe Prices behind `STRIPE_PRICE_ID`
   and `STRIPE_FEATURED_PRICE_ID`. `PRICE_LABEL` / `FEATURED_PRICE_LABEL`
   in `src/config.js` are display-only; keep in sync manually.
8. **Admin = any authenticated user.** Signups are disabled in Supabase
   Auth; only invited newsroom accounts exist. Do not build a roles table.
9. **`stripe-webhook` and `jobs-feed` deploy with `verify_jwt = false`**
   (supabase/config.toml). The webhook's authenticity check is the Stripe
   signature, full stop; the feed is public and reads with the ANON key so
   the board's RLS policy stays the single visibility mechanism.
10. **`notify-employer` resolves the JWT to a real user.** `verify_jwt`
    alone would accept the anon key (it is a valid JWT); the handler calls
    `auth.getUser()` and rejects non-user tokens.

## Repo layout

```
public/wpr-typewriter.png          WPR typewriter seal (shared w/ community-board)
src/
  config.js            Supabase URL/anon key, price labels, POSTING_DAYS
  supabase.js          Client. Throws at load if config.js is unconfigured.
  App.jsx              Hash router: #/ #/post #/success #/admin #/job/:id
  lib/taxonomy.js      Categories + employment types (mirrored in submit-job)
  lib/format.js        Pay ranges, dates
  views/Board.jsx      Public board (iframe-embedded), deep links, share
  views/PostJob.jsx    Submission form (tier picker) → Stripe
  views/Success.jsx    Post-checkout confirmation
  views/Admin.jsx      Login + review queue (edit-before-approve) / live / archive
supabase/
  migrations/001_jobs.sql          Table, RLS, column grants
  migrations/002_featured.sql      Featured tier column + anon grant
  functions/_shared/email.ts       Resend helper (one email path)
  functions/submit-job/index.ts    Validate + insert + Checkout Session
  functions/stripe-webhook/index.ts Signature check + status flip + receipt email
  functions/notify-employer/index.ts Admin-triggered approve/reject emails
  functions/jobs-feed/index.ts     Public RSS/JSON feed (anon key reads)
  config.toml                      verify_jwt per function
.github/workflows/deploy.yml       Pages deploy on push to main
```

## Commands (Windows / PowerShell 5.1 — use `;` not `&&`)

```powershell
npm install; npm run dev          # local dev at localhost:5173
npm run build                     # production build to dist/
supabase functions deploy submit-job; supabase functions deploy stripe-webhook; supabase functions deploy notify-employer; supabase functions deploy jobs-feed
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_PRICE_ID=price_... STRIPE_FEATURED_PRICE_ID=price_... STRIPE_WEBHOOK_SECRET=whsec_... SITE_URL=https://rowanflynnpilot.github.io/wpr-jobs/ RESEND_API_KEY=re_... "EMAIL_FROM=Now Hiring in Marathon County <jobs@wausaupilotandreview.com>"
```

## Design system

WPR house style, matching wausaupilotandreview.com and its siblings
(`wpr-obituaries`, `wpr-community-board`): **Oswald** (condensed nameplate
face — headings, buttons, tabs), **Merriweather** (reading serif — body),
**Courier Prime** (typewriter voice — pay, badges, eyebrows, count lines).
Teal `#3A867C` is sampled from the typewriter logo; cream `#f6f2e9`
background; site red `#dd3333` is reserved for the one revenue CTA
("Post a job" / "Continue to payment"). Fonts are self-hosted via
Fontsource (imported in `src/main.jsx`) so no reader request leaves the
site from inside the WordPress iframe. The typewriter seal
(`public/wpr-typewriter.png`, shared with wpr-community-board) is the
board header mark, favicon, and og:image. Signature element: the
classified-ad "Help wanted" eyebrow with flanking rules — a deliberate
nod to the newspaper classifieds this board descends from.

## Philosophy

One correct path, no fallbacks. Fail fast and loud (`supabase.js` throws on
unconfigured keys; edge functions 400/500 with real messages). Surgical
changes only. Fix root causes.
