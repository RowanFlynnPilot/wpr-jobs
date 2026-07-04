// _shared/email.ts · one email path for every function that writes to an
// employer. Resend HTTP API, plain-text messages in the newsroom's voice.
//
// Secrets required: RESEND_API_KEY, EMAIL_FROM
//   EMAIL_FROM example: "Now Hiring in Marathon County <jobs@wausaupilotandreview.com>"

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!key) throw new Error("Missing required secret: RESEND_API_KEY");
  if (!from) throw new Error("Missing required secret: EMAIL_FROM");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

export const SIGNATURE =
  "\n\n— Wausau Pilot & Review\nNow Hiring in Marathon County · your nonprofit local newsroom";
