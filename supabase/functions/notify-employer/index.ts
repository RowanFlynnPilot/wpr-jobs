// notify-employer · Supabase Edge Function
//
// Called by the signed-in admin UI after an approve or reject. Reads the
// row's CURRENT status from the database (never trusts client-provided
// content) and sends the matching email to the employer's contact address.
//
// Auth: verify_jwt = true gets us a valid Supabase JWT, but the anon key is
// also a valid JWT — so we additionally resolve the token to a real user.
// Signups are disabled; the only users are invited newsroom accounts.
//
// Secrets required: RESEND_API_KEY, EMAIL_FROM, SITE_URL
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, SIGNATURE } from "../_shared/email.ts";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only." }, 405);

  // Resolve the JWT to a real user. The anon key passes verify_jwt but is
  // not a user token, so getUser() rejects it here.
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing Authorization header." }, 401);
  const { data: userData, error: userError } =
    await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return json({ error: "Newsroom accounts only." }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }
  const jobId = typeof body.job_id === "string" ? body.job_id : "";
  if (!jobId) return json({ error: "job_id is required." }, 400);

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select(
      "id,title,company,status,contact_name,contact_email,expires_at,rejection_reason",
    )
    .eq("id", jobId)
    .single();
  if (jobError || !job) return json({ error: "Job not found." }, 404);

  const boardUrl = env("SITE_URL");

  if (job.status === "published") {
    await sendEmail({
      to: job.contact_email,
      subject: `You're live — ${job.title}`,
      text:
        `Hi ${job.contact_name},\n\n` +
        `"${job.title}" at ${job.company} is now live on Now Hiring in ` +
        `Marathon County and runs through ${formatDate(job.expires_at)}.\n\n` +
        `See it on the board: ${boardUrl}\n\n` +
        `When the run ends, you can repost the position any time with a ` +
        `fresh submission. Thanks for hiring local.` +
        SIGNATURE,
    });
    return json({ sent: "approved" });
  }

  if (job.status === "rejected") {
    await sendEmail({
      to: job.contact_email,
      subject: `About your posting — ${job.title}`,
      text:
        `Hi ${job.contact_name},\n\n` +
        `We weren't able to publish "${job.title}" at ${job.company}.\n\n` +
        `From our editors: ${job.rejection_reason ?? "(no reason recorded)"}\n\n` +
        `Reply to this email and we'll sort out a revised posting or a ` +
        `refund.` +
        SIGNATURE,
    });
    return json({ sent: "rejected" });
  }

  return json(
    { error: `Job status is '${job.status}' — nothing to notify about.` },
    409,
  );
});
