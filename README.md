# wpr-jobs · Now Hiring in Marathon County

Paid local job board for [Wausau Pilot & Review](https://wausaupilotandreview.com).
Employers pay **$75** for a 30-day posting — or **$150** for a featured
posting, front and center at the top of the board — via Stripe Checkout;
every submission is reviewed by the newsroom before publication. Employers
get email at every step (payment received, live, or rejected with reason).
See `CLAUDE.md` for architecture and invariants.

## Go-live checklist

### 1. Supabase project

1. Create a project at supabase.com. Note the **Project URL** and **anon key**
   (Settings → API).
2. Run `supabase/migrations/001_jobs.sql` **and `002_featured.sql`** in the
   SQL Editor (or link the repo and `supabase db push`).
3. Authentication → Sign In / Up → **disable new user signups**.
4. Authentication → Users → **invite** the admin accounts (you + Shereen).
   Each invitee sets a password via the emailed link.

### 2. Stripe

1. Create two Products, each with a one-time Price:
   - *"Job posting — 30 days (Now Hiring in Marathon County)"* — **$75**
   - *"Featured job posting — 30 days"* — **$150**
   Copy both `price_...` ids.
2. Grab your secret key (`sk_...`). Start with **test mode** keys — see
   Testing below.
3. Discounts for launch partners: create a Coupon + Promotion Code in the
   dashboard — checkout already accepts promo codes.

### 3. Resend (employer emails)

1. Create a resend.com account and **verify the sending domain**
   (wausaupilotandreview.com).
2. Copy the API key (`re_...`). Pick the from-address, e.g.
   `Now Hiring in Marathon County <jobs@wausaupilotandreview.com>`.

### 4. Secrets + deploy functions

With the Supabase CLI linked to the project:

```powershell
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_PRICE_ID=price_... STRIPE_FEATURED_PRICE_ID=price_... SITE_URL=https://rowanflynnpilot.github.io/wpr-jobs/ RESEND_API_KEY=re_... "EMAIL_FROM=Now Hiring in Marathon County <jobs@wausaupilotandreview.com>"
supabase functions deploy submit-job; supabase functions deploy stripe-webhook; supabase functions deploy notify-employer; supabase functions deploy jobs-feed
```

`supabase/config.toml` handles the per-function JWT settings —
`stripe-webhook` (Stripe authenticates via signature) and `jobs-feed`
(public feed) deploy with JWT verification off.

### 5. Stripe webhook

1. Stripe Dashboard → Developers → Webhooks → Add endpoint:
   `https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook`
2. Subscribe to the single event **`checkout.session.completed`**.
3. Copy the signing secret and set it:

```powershell
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 6. Frontend config + deploy

1. Fill in `src/config.js` (Supabase URL + anon key). The app throws at load
   until you do — that's intentional.
2. Push to `RowanFlynnPilot/wpr-jobs` on `main`.
3. Repo → Settings → Pages → Source: **GitHub Actions**. The included
   workflow builds and deploys automatically.

### 7. WordPress embed

See **`docs/embedding.md`** for the full snippet: auto-height iframe,
deep-link forwarding, and the `VITE_PUBLIC_URL` Actions variable that makes
every Copy-link share point at the WordPress page instead of raw GitHub
Pages.

Employers can be sent directly to the submission form: `.../#/post`
Admin review queue: `.../#/admin` (never link it publicly)

## Testing end-to-end (do this before real money)

1. Use **test-mode** Stripe keys, test-mode Prices, and a test-mode webhook
   endpoint for steps 2–5 above.
2. Submit a posting through `#/post` (try both tiers), pay with card
   `4242 4242 4242 4242` (any future expiry, any CVC).
3. Confirm the "with our editors" email arrives, the row lands in the admin
   **Review queue**, approve it, confirm the "you're live" email and that it
   appears on the public board (featured postings pinned on top, red frame).
4. Confirm rejection (with its email) and takedown both work.
5. Check the feed: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/jobs-feed`
   (RSS) and `...?format=json`.
6. Swap in live keys and re-run `supabase secrets set`.

## Routine operations

- **Review**: open `#/admin`, work the queue. *Edit…* fixes typos before
  publishing. Approve publishes for 30 days from that moment and emails the
  employer. Reject asks for a reason — it is emailed to the employer.
- **Take down early**: Live tab → *Take down now* (sets `expires_at` to now).
- **Expiry**: automatic and derived — nothing to run. Postings drop off the
  public board the moment `expires_at` passes.
- **Renewals**: an employer re-submits and pays again. There is deliberately
  no renewal flow in v1 (the "you're live" email tells them how).
- **Newsletter**: pull the week's postings from `jobs-feed` (RSS or
  `?format=json`); every item links to its `#/job/<id>` deep link.

## Local development

```powershell
npm install; npm run dev
```
