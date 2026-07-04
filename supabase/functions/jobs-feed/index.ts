// jobs-feed · Supabase Edge Function
//
// Read-only feed of the postings that are live RIGHT NOW, for the weekly
// "Now Hiring" section in the WPR newsletter and anything else that wants
// to syndicate the board. GET only:
//   /jobs-feed            → RSS 2.0
//   /jobs-feed?format=json → JSON
//
// Deliberately built on the ANON key (injected by the platform), not the
// service role: the same RLS policy and column grants that govern the
// public board govern this feed. There is no second visibility mechanism
// to keep in sync — if it's on the board, it's in the feed.
//
// Deployed with verify_jwt = false (public feed). Secrets required: SITE_URL.

import { createClient } from "npm:@supabase/supabase-js@2";

const PUBLIC_COLUMNS =
  "id,title,company,location,employment_type,category," +
  "pay_min,pay_max,pay_period,description,apply_url,apply_email," +
  "published_at,expires_at,featured";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"));

const CORS = { "Access-Control-Allow-Origin": "*" };

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatPay(
  min: number | null,
  max: number | null,
  period: string | null,
): string | null {
  if (min == null && max == null) return null;
  const unit = period === "hour" ? "/hr" : "/yr";
  const fmt = (n: number) => "$" + n.toLocaleString("en-US");
  if (min != null && max != null && min !== max) {
    return `${fmt(min)}–${fmt(max)}${unit}`;
  }
  return `${fmt((min ?? max) as number)}${unit}`;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return new Response("GET only.", { status: 405, headers: CORS });
  }

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(PUBLIC_COLUMNS)
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false });
  if (error) {
    return new Response(`Feed query failed: ${error.message}`, {
      status: 500,
      headers: CORS,
    });
  }

  const site = env("SITE_URL");
  const url = new URL(req.url);

  if (url.searchParams.get("format") === "json") {
    const items = jobs.map((j) => ({
      ...j,
      pay: formatPay(j.pay_min, j.pay_max, j.pay_period),
      link: `${site}#/job/${j.id}`,
    }));
    return new Response(JSON.stringify({ jobs: items }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const items = jobs
    .map((j) => {
      const pay = formatPay(j.pay_min, j.pay_max, j.pay_period);
      const facts = [j.location, pay, j.category].filter(Boolean).join(" · ");
      return (
        `    <item>\n` +
        `      <title>${escapeXml(`${j.title} — ${j.company}`)}</title>\n` +
        `      <link>${escapeXml(`${site}#/job/${j.id}`)}</link>\n` +
        `      <guid isPermaLink="false">wpr-jobs-${j.id}</guid>\n` +
        `      <pubDate>${new Date(j.published_at).toUTCString()}</pubDate>\n` +
        `      <description>${escapeXml(`${facts}\n\n${j.description}`)}</description>\n` +
        `    </item>`
      );
    })
    .join("\n");

  const rss =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0">\n` +
    `  <channel>\n` +
    `    <title>Now Hiring in Marathon County — Wausau Pilot &amp; Review</title>\n` +
    `    <link>${escapeXml(site)}</link>\n` +
    `    <description>Local job openings from Marathon County employers, reviewed by the Wausau Pilot &amp; Review newsroom.</description>\n` +
    `${items}\n` +
    `  </channel>\n` +
    `</rss>\n`;

  return new Response(rss, {
    headers: { ...CORS, "Content-Type": "application/rss+xml; charset=utf-8" },
  });
});
