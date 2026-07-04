// submit-job · Supabase Edge Function
//
// The ONLY write path for employer submissions:
//   validate -> insert row as 'pending_payment' -> create Stripe Checkout
//   Session (job id in metadata) -> return the checkout URL.
//
// Secrets required (supabase secrets set ...):
//   STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
//
// INVARIANT: the taxonomy below mirrors src/lib/taxonomy.js. Change both.

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const CATEGORIES = [
  "Healthcare",
  "Manufacturing",
  "Education",
  "Trades & Construction",
  "Office & Professional",
  "Retail & Hospitality",
  "Government & Nonprofit",
  "Transportation & Logistics",
  "Other",
];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "seasonal", "contract"];
const PAY_PERIODS = ["hour", "year"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

const stripe = new Stripe(env("STRIPE_SECRET_KEY"));
const supabase = createClient(
  env("SUPABASE_URL"),
  env("SUPABASE_SERVICE_ROLE_KEY"),
);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

// deno-lint-ignore no-explicit-any
function validate(body: Record<string, any>) {
  const errors: string[] = [];

  const title = str(body.title);
  const company = str(body.company);
  const location = str(body.location);
  const employment_type = str(body.employment_type);
  const category = str(body.category);
  const description = str(body.description);
  const apply_url = str(body.apply_url) || null;
  const apply_email = str(body.apply_email) || null;
  const contact_name = str(body.contact_name);
  const contact_email = str(body.contact_email);
  const pay_min = optionalNumber(body.pay_min);
  const pay_max = optionalNumber(body.pay_max);
  const pay_period = str(body.pay_period) || null;

  if (title.length < 3 || title.length > 120) {
    errors.push("Job title must be 3–120 characters.");
  }
  if (company.length < 2 || company.length > 120) {
    errors.push("Company name must be 2–120 characters.");
  }
  if (location.length < 2 || location.length > 120) {
    errors.push("Location must be 2–120 characters.");
  }
  if (!EMPLOYMENT_TYPES.includes(employment_type)) {
    errors.push("Employment type is not one of the allowed values.");
  }
  if (!CATEGORIES.includes(category)) {
    errors.push("Category is not one of the allowed values.");
  }
  if (description.length < 40 || description.length > 6000) {
    errors.push("Description must be 40–6,000 characters.");
  }
  if (!apply_url && !apply_email) {
    errors.push("Provide an application link or an application email.");
  }
  if (apply_url && !/^https?:\/\/.+/.test(apply_url)) {
    errors.push("Application link must start with http:// or https://.");
  }
  if (apply_email && !apply_email.includes("@")) {
    errors.push("Application email is not a valid address.");
  }
  if (contact_name.length < 2 || contact_name.length > 120) {
    errors.push("Contact name must be 2–120 characters.");
  }
  if (!contact_email.includes("@")) {
    errors.push("Contact email is not a valid address.");
  }
  if (Number.isNaN(pay_min) || Number.isNaN(pay_max)) {
    errors.push("Pay values must be numbers.");
  } else {
    if ((pay_min ?? 0) < 0 || (pay_max ?? 0) < 0) {
      errors.push("Pay values cannot be negative.");
    }
    if (pay_min !== null && pay_max !== null && pay_max < pay_min) {
      errors.push("Maximum pay cannot be less than minimum pay.");
    }
    if ((pay_min !== null || pay_max !== null) && !pay_period) {
      errors.push("Choose per hour or per year when providing pay.");
    }
  }
  if (pay_period && !PAY_PERIODS.includes(pay_period)) {
    errors.push("Pay period is not one of the allowed values.");
  }

  return {
    errors,
    row: {
      title,
      company,
      location,
      employment_type,
      category,
      pay_min: Number.isNaN(pay_min) ? null : pay_min,
      pay_max: Number.isNaN(pay_max) ? null : pay_max,
      pay_period: pay_min === null && pay_max === null ? null : pay_period,
      description,
      apply_url,
      apply_email,
      contact_name,
      contact_email,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only." }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const { errors, row } = validate(body);
  if (errors.length > 0) return json({ error: errors.join(" ") }, 400);

  const { data: job, error: insertError } = await supabase
    .from("jobs")
    .insert(row)
    .select("id")
    .single();
  if (insertError) {
    return json({ error: `Could not save posting: ${insertError.message}` }, 500);
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: env("STRIPE_PRICE_ID"), quantity: 1 }],
      metadata: { job_id: job.id },
      customer_email: row.contact_email,
      success_url: `${env("SITE_URL")}#/success`,
      cancel_url: `${env("SITE_URL")}#/post`,
    });
  } catch (err) {
    return json(
      { error: `Could not start checkout: ${(err as Error).message}` },
      500,
    );
  }

  const { error: updateError } = await supabase
    .from("jobs")
    .update({ stripe_session_id: session.id })
    .eq("id", job.id);
  if (updateError) {
    return json(
      { error: `Could not record checkout session: ${updateError.message}` },
      500,
    );
  }

  return json({ url: session.url });
});
