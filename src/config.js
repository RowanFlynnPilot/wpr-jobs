// Fill these in before first deploy. The anon key is public by design —
// what anon can see is enforced by RLS row policies and column grants in
// supabase/migrations/001_jobs.sql, not by hiding this key.
export const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co'
export const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY'

// Display only. The amounts actually charged are the Stripe Price objects
// behind the STRIPE_PRICE_ID / STRIPE_FEATURED_PRICE_ID secrets. If a price
// changes in Stripe, change it here too — there is no automatic sync.
export const PRICE_LABEL = '$75'
export const FEATURED_PRICE_LABEL = '$150'
export const POSTING_DAYS = 30
