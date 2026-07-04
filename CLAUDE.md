# wpr-jobs — CLAUDE.md

Paid local job board for Wausau Pilot & Review. Public title: **Now Hiring
in Marathon County**. Revenue product: employers pay $75 (Stripe) for a
30-day posting; the newsroom reviews every submission before it goes live.
Same submission → review → publish contract pattern as `wpr-obituaries`.

## Architecture — one correct path

```
Employer fills #/post
      → Edge Function submit-job (validate, insert 'pending_payment',
        create Stripe Checkout Session with job_id in metadata)
      → Employer pays on Stripe
      → Edge Function stripe-webhook (verify signature,
        flip 'pending_payment' → 'pending_review')
      → Admin approves in #/admin
      → 'published', expires_at = now + 30 days
      → Visibility ends when expires_at passes (RLS policy, nothing else)
```

Frontend: React 18 + Vite → GitHub Pages (`RowanFlynnPilot/wpr-jobs`) →
WordPress iframe embed. Backend: Supabase (Postgres + RLS + Edge Functions).
Payments: Stripe Checkout, one Price object.

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
7. **Price**: charged amount = the Stripe Price behind `STRIPE_PRICE_ID`.
   `PRICE_LABEL` in `src/config.js` is display-only; keep in sync manually.
8. **Admin = any authenticated user.** Signups are disabled in Supabase
   Auth; only invited newsroom accounts exist. Do not build a roles table.
9. **`stripe-webhook` deploys with `verify_jwt = false`** (supabase/
   config.toml). Its authenticity check is the Stripe signature, full stop.

## Repo layout

```
src/
  config.js            Supabase URL/anon key, PRICE_LABEL, POSTING_DAYS
  supabase.js          Client. Throws at load if config.js is unconfigured.
  App.jsx              Hand-rolled hash router: #/ #/post #/success #/admin
  lib/taxonomy.js      Categories + employment types (mirrored in submit-job)
  lib/format.js        Pay ranges, dates
  views/Board.jsx      Public board (iframe-embedded)
  views/PostJob.jsx    Submission form → Stripe
  views/Success.jsx    Post-checkout confirmation
  views/Admin.jsx      Login + review queue / live / archive
supabase/
  migrations/001_jobs.sql          Table, RLS, column grants
  functions/submit-job/index.ts    Validate + insert + Checkout Session
  functions/stripe-webhook/index.ts Signature check + status flip
  config.toml                      verify_jwt per function
.github/workflows/deploy.yml       Pages deploy on push to main
```

## Commands (Windows / PowerShell 5.1 — use `;` not `&&`)

```powershell
npm install; npm run dev          # local dev at localhost:5173
npm run build                     # production build to dist/
supabase functions deploy submit-job; supabase functions deploy stripe-webhook
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_PRICE_ID=price_... STRIPE_WEBHOOK_SECRET=whsec_... SITE_URL=https://rowanflynnpilot.github.io/wpr-jobs/
```

## Design system

WPR standard: teal `#3A867C`, cream `#f6f2e9`, Fraunces (display), Public
Sans (body), JetBrains Mono (data: pay, badges, eyebrows). Signature
element: the classified-ad "Help wanted" eyebrow with flanking rules — a
deliberate nod to the newspaper classifieds this board descends from.

## Philosophy

One correct path, no fallbacks. Fail fast and loud (`supabase.js` throws on
unconfigured keys; edge functions 400/500 with real messages). Surgical
changes only. Fix root causes.
