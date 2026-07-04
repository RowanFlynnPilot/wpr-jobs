# wpr-jobs · Now Hiring in Marathon County

Paid local job board for [Wausau Pilot & Review](https://wausaupilotandreview.com).
Employers pay $75 for a 30-day posting via Stripe Checkout; every submission
is reviewed by the newsroom before publication. See `CLAUDE.md` for
architecture and invariants.

## Go-live checklist

### 1. Supabase project

1. Create a project at supabase.com. Note the **Project URL** and **anon key**
   (Settings → API).
2. Run `supabase/migrations/001_jobs.sql` in the SQL Editor (or link the repo
   and `supabase db push`).
3. Authentication → Sign In / Up → **disable new user signups**.
4. Authentication → Users → **invite** the admin accounts (you + Shereen).
   Each invitee sets a password via the emailed link.

### 2. Stripe

1. Create a Product: *"Job posting — 30 days (Now Hiring in Marathon
   County)"* with a one-time Price of **$75**. Copy the `price_...` id.
2. Grab your secret key (`sk_...`). Start with **test mode** keys — see
   Testing below.

### 3. Secrets + deploy functions

With the Supabase CLI linked to the project:

```powershell
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_PRICE_ID=price_... SITE_URL=https://rowanflynnpilot.github.io/wpr-jobs/
supabase functions deploy submit-job; supabase functions deploy stripe-webhook
```

`supabase/config.toml` handles the per-function JWT settings —
`stripe-webhook` deploys with JWT verification off because Stripe
authenticates via signature.

### 4. Stripe webhook

1. Stripe Dashboard → Developers → Webhooks → Add endpoint:
   `https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook`
2. Subscribe to the single event **`checkout.session.completed`**.
3. Copy the signing secret and set it:

```powershell
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 5. Frontend config + deploy

1. Fill in `src/config.js` (Supabase URL + anon key). The app throws at load
   until you do — that's intentional.
2. Push to `RowanFlynnPilot/wpr-jobs` on `main`.
3. Repo → Settings → Pages → Source: **GitHub Actions**. The included
   workflow builds and deploys automatically.

### 6. WordPress embed

```html
<iframe
  src="https://rowanflynnpilot.github.io/wpr-jobs/"
  style="width:100%;height:1400px;border:0;"
  title="Now Hiring in Marathon County"
  loading="lazy"></iframe>
```

Employers can be sent directly to the submission form:
`https://rowanflynnpilot.github.io/wpr-jobs/#/post`

Admin review queue: `https://rowanflynnpilot.github.io/wpr-jobs/#/admin`

## Testing end-to-end (do this before real money)

1. Use **test-mode** Stripe keys and a test-mode Price + webhook endpoint for
   steps 2–4 above.
2. Submit a posting through `#/post`, pay with card `4242 4242 4242 4242`
   (any future expiry, any CVC).
3. Confirm the row lands in the admin **Review queue**, approve it, and
   confirm it appears on the public board.
4. Confirm rejection and takedown both work.
5. Swap in live keys (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
   `STRIPE_WEBHOOK_SECRET` all have live-mode counterparts) and re-run
   `supabase secrets set`.

## Routine operations

- **Review**: open `#/admin`, work the queue. Approve publishes for 30 days
  from that moment. Reject asks for a reason (stored, shown in Archive).
- **Take down early**: Live tab → *Take down now* (sets `expires_at` to now).
- **Expiry**: automatic and derived — nothing to run. Postings drop off the
  public board the moment `expires_at` passes.
- **Renewals**: an employer re-submits and pays again. There is deliberately
  no renewal flow in v1.

## Local development

```powershell
npm install; npm run dev
```
