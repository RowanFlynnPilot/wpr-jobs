-- wpr-jobs · 002_featured.sql
-- Featured tier: a paid upgrade that pins a posting to the top of the board
-- with the red treatment. Same lifecycle, same review, same 30 days — the
-- only difference is sort order and styling. The charged amount is the
-- Stripe Price behind STRIPE_FEATURED_PRICE_ID (see submit-job).

alter table public.jobs
  add column featured boolean not null default false;

-- Publicly visible: the board sorts featured postings first. This is an
-- additive column grant — the rest of the anon column list is unchanged
-- (see 001_jobs.sql).
grant select (featured) on public.jobs to anon;
