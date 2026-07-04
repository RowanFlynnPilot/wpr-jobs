// stripe-webhook · Supabase Edge Function
//
// Stripe calls this with `checkout.session.completed`. We verify the
// signature, read the job id from session metadata, and flip the row from
// 'pending_payment' to 'pending_review'. Nothing else. Publication is a
// human decision made in the admin queue.
//
// Deployed with verify_jwt = false (see supabase/config.toml) — Stripe does
// not send Supabase JWTs. Authenticity is the signature check, full stop.
//
// Secrets required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

const stripe = new Stripe(env("STRIPE_SECRET_KEY"));
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const supabase = createClient(
  env("SUPABASE_URL"),
  env("SUPABASE_SERVICE_ROLE_KEY"),
);

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header.", { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      env("STRIPE_WEBHOOK_SECRET"),
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    return new Response(
      `Signature verification failed: ${(err as Error).message}`,
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const jobId = session.metadata?.job_id;
    if (!jobId) {
      return new Response("checkout.session.completed without job_id metadata.", {
        status: 400,
      });
    }

    const { data, error } = await supabase
      .from("jobs")
      .update({ status: "pending_review", paid_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("status", "pending_payment")
      .select("id");

    if (error) {
      // Non-2xx makes Stripe retry — correct behavior for a transient DB failure.
      return new Response(`DB update failed: ${error.message}`, { status: 500 });
    }
    if (!data || data.length === 0) {
      // Zero rows matched: either a Stripe retry of an event we already
      // processed (fine) or an unknown job id (should never happen — check logs).
      console.warn(`stripe-webhook: no pending_payment row for job ${jobId}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
