/**
 * Supabase Edge Function: Send email notifications via Resend.
 *
 * Deploy:
 *   1. Install Supabase CLI: npm i -g supabase
 *   2. Login: supabase login
 *   3. Link project: supabase link --project-ref <ref>
 *   4. Set secret: supabase secrets set RESEND_API_KEY=re_xxx
 *   5. Deploy: supabase functions deploy send-email
 *
 * Usage (from another Edge Function or pg_net):
 *   POST /functions/v1/send-email
 *   {
 *     "to": "user@example.com",
 *     "subject": "新回复通知",
 *     "html": "<p>有人在你的帖子中回复了</p>"
 *   }
 */

import { Resend } from "npm:resend@4.0.0";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  console.error("RESEND_API_KEY not set");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS = "Timix观察站 <notify@timin.cc>";

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
}

Deno.serve(async (req: Request) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Auth check — require Supabase service role or anon key
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!resend) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: EmailRequest = await req.json();

    if (!body.to || !body.subject || !body.html) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, html" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: body.to,
      subject: body.subject,
      html: body.html,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
