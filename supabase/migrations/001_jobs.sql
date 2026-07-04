-- wpr-jobs · 001_jobs.sql
-- Single table, single lifecycle. Run once in the Supabase SQL editor
-- (or `supabase db push`).
--
-- Status lifecycle:  pending_payment -> pending_review -> published | rejected
-- "Expired" is DERIVED (status = 'published' AND expires_at <= now()).
-- It is never stored and there is no cron job — the anon read policy below
-- is the single mechanism that ends a posting's visibility.

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'pending_review', 'published', 'rejected')),

  -- Public listing content
  title text not null check (char_length(title) between 3 and 120),
  company text not null check (char_length(company) between 2 and 120),
  location text not null check (char_length(location) between 2 and 120),
  employment_type text not null
    check (employment_type in ('full_time', 'part_time', 'seasonal', 'contract')),
  category text not null check (char_length(category) between 2 and 60),
  pay_min numeric check (pay_min is null or pay_min >= 0),
  pay_max numeric check (pay_max is null or pay_max >= 0),
  pay_period text check (pay_period in ('hour', 'year')),
  description text not null check (char_length(description) between 40 and 6000),
  apply_url text,
  apply_email text,

  -- Private: employer contact. Never exposed to anon — see column grants below.
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_email text not null check (position('@' in contact_email) > 1),

  -- Payment + lifecycle bookkeeping
  stripe_session_id text unique,
  paid_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  rejection_reason text,

  constraint apply_method_present
    check (apply_url is not null or apply_email is not null),
  constraint pay_range_valid
    check (pay_min is null or pay_max is null or pay_max >= pay_min),
  constraint pay_period_present
    check ((pay_min is null and pay_max is null) or pay_period is not null)
);

create index jobs_public_board_idx on public.jobs (status, expires_at desc);

alter table public.jobs enable row level security;

-- Anon: read live postings only. There are NO insert/update/delete policies
-- for anon — every write goes through an Edge Function using the service role.
create policy "anon reads live jobs"
  on public.jobs for select
  to anon
  using (status = 'published' and expires_at > now());

-- Authenticated = admins. Signups are disabled in Auth settings; the only
-- authenticated users are invited newsroom accounts.
create policy "admins read everything"
  on public.jobs for select
  to authenticated
  using (true);

create policy "admins update jobs"
  on public.jobs for update
  to authenticated
  using (true)
  with check (true);

-- No delete policy for anyone: rows are never deleted. Rejection and takedown
-- are status/expiry changes. Same ledger discipline as wpr-obituaries.

-- Column-level privacy. RLS controls WHICH ROWS anon sees; these grants
-- control WHICH COLUMNS. contact_*, stripe_*, status, and review fields are
-- structurally invisible to the public — a `select('*')` from the anon key
-- fails loudly instead of leaking.
revoke all on public.jobs from anon;
grant select (
  id, title, company, location, employment_type, category,
  pay_min, pay_max, pay_period, description, apply_url, apply_email,
  published_at, expires_at
) on public.jobs to anon;
