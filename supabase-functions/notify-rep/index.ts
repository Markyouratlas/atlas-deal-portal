// =====================================================
// Atlas Deal Portal — notify-rep Edge Function
//
// Sends branded transactional emails to the channel partner / rep when a
// deal is submitted, qualified, or declined.
//
// Deploy:  supabase functions deploy notify-rep --no-verify-jwt
// Secrets (supabase secrets set ...):
//   RESEND_API_KEY               required — Resend API key
//   SUPABASE_URL                 auto-provided in the function runtime
//   SUPABASE_SERVICE_ROLE_KEY    auto-provided — used to look up rep email & calendar
//   PORTAL_URL                   optional — public site URL for the email logo
//                                (defaults to the portal's production domain)
//
// Invoked by the deals DB trigger (see supabase-rep-notifications.sql) with:
//   { "action": "deal_submitted" | "deal_qualified" | "deal_declined",
//     "deal": <the deals row as JSON> }
// =====================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PORTAL_URL = (Deno.env.get("PORTAL_URL") ?? "https://portal.youratlas.com").replace(/\/$/, "");

const FROM = "Atlas Deal Portal <noreply@youratlas.com>";
const DEFAULT_CAL = "https://cal.com/heatheratlas/atlas-channel-partner-30-min-demo";
const LOGO_URL = `${PORTAL_URL}/logo-white-email.png`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

type Deal = Record<string, any>;

// --- Branded email shell: dark header, white card, optional purple CTA button ---
function emailLayout(opts: { heading: string; intro: string; bodyHtml: string; cta?: { label: string; url: string } }): string {
  const { heading, intro, bodyHtml, cta } = opts;
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
         <tr><td style="border-radius:10px;background:linear-gradient(135deg,#6639a6 0%,#7c4dca 100%);">
           <a href="${cta.url}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${cta.label}</a>
         </td></tr>
       </table>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Dark header -->
        <tr><td style="background:linear-gradient(145deg,#1a0e2e 0%,#261545 45%,#1e1040 100%);padding:28px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="Atlas" height="28" style="height:28px;display:inline-block;" />
        </td></tr>
        <!-- White card body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1e293b;">${heading}</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">${intro}</p>
          ${bodyHtml}
          ${button}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">Atlas Deal Portal · This is an automated message regarding your channel partner deal registration.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// --- Deal summary block reused across all email types ---
function dealSummary(deal: Deal): string {
  const flagPill = (flag?: string) => {
    if (flag === "green") return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#d1fae5;color:#065f46;">Great Fit</span>`;
    if (flag === "red") return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#fee2e2;color:#b91c1c;">Needs Review</span>`;
    return "";
  };
  const row = (label: string, value: string, flag?: string) =>
    `<tr>
       <td style="padding:8px 0;font-size:12px;color:#94a3b8;width:42%;vertical-align:top;">${label}</td>
       <td style="padding:8px 0;font-size:13px;color:#1e293b;font-weight:600;">${value || "—"} ${flag ? flagPill(flag) : ""}</td>
     </tr>`;

  const esc = (s: any) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;border:1px solid #f1f5f9;border-radius:12px;background:#f8fafc;padding:8px 16px;">
    ${row("Business", esc(deal.business_name))}
    ${row("Contact", esc(deal.contact_name))}
    ${row("Contact Email", esc(deal.contact_email))}
    ${row("Call Volume", esc(deal.call_volume), deal.call_volume_flag)}
    ${row("Connects 100% 24/7?", deal.connects_100 === "yes" ? "Yes" : "No", deal.connects_100_flag)}
    ${row("Avg Value", esc(deal.avg_value), deal.avg_value_flag)}
  </table>`;
}

// Resolve the rep's email: prefer the denormalized deal.rep_email, else look up the partner profile.
async function resolveRepEmail(deal: Deal): Promise<string | null> {
  if (deal.rep_email && String(deal.rep_email).trim()) return String(deal.rep_email).trim();
  if (deal.partner_id) {
    const { data } = await supabase.from("profiles").select("email").eq("id", deal.partner_id).single();
    if (data?.email) return data.email;
  }
  return null;
}

// Resolve the reviewing admin's calendar link, falling back to the default Cal.com URL.
async function resolveCalendarUrl(deal: Deal): Promise<string> {
  if (deal.reviewed_by) {
    const { data } = await supabase.from("profiles").select("calendar_url").eq("id", deal.reviewed_by).single();
    if (data?.calendar_url && String(data.calendar_url).trim()) return String(data.calendar_url).trim();
  }
  return DEFAULT_CAL;
}

function buildEmail(action: string, deal: Deal, calendarUrl: string): { subject: string; html: string } | null {
  const biz = deal.business_name || "your deal";
  const summary = dealSummary(deal);

  if (action === "deal_submitted") {
    return {
      subject: "Atlas Deal Portal — Deal Registered Successfully",
      html: emailLayout({
        heading: "Deal registered 🎉",
        intro: `Your deal registration for <strong>${biz}</strong> has been received and is pending review. We'll let you know as soon as it's been reviewed.`,
        bodyHtml: summary,
      }),
    };
  }

  if (action === "deal_qualified") {
    return {
      subject: "Atlas Deal Portal — Deal Qualified!",
      html: emailLayout({
        heading: "Great news — your deal qualified! 🚀",
        intro: `Great news! Your deal for <strong>${biz}</strong> has been qualified. Click below to book a demo.`,
        bodyHtml: summary,
        cta: { label: "Book a Demo", url: calendarUrl },
      }),
    };
  }

  if (action === "deal_declined") {
    const notes = deal.notes && String(deal.notes).trim()
      ? `<div style="margin:12px 0;padding:12px 16px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;"><p style="margin:0;font-size:12px;color:#9a3412;"><strong>Reviewer notes:</strong> ${String(deal.notes).replace(/[<>]/g, "")}</p></div>`
      : "";
    return {
      subject: "Atlas Deal Portal — Deal Update",
      html: emailLayout({
        heading: "An update on your deal",
        intro: `After review, <strong>${biz}</strong> doesn't meet our current qualification criteria. Feel free to submit new opportunities anytime — we appreciate you working with Atlas.`,
        bodyHtml: notes + summary,
      }),
    };
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const { action, deal } = await req.json();
    if (!action || !deal) throw new Error("Missing 'action' or 'deal' in request body");

    const to = await resolveRepEmail(deal);
    if (!to) {
      return new Response(JSON.stringify({ skipped: true, reason: "no rep email found" }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const calendarUrl = action === "deal_qualified" ? await resolveCalendarUrl(deal) : DEFAULT_CAL;
    const email = buildEmail(action, deal, calendarUrl);
    if (!email) {
      return new Response(JSON.stringify({ skipped: true, reason: `unsupported action: ${action}` }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject: email.subject, html: email.html }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(result)}`);

    return new Response(JSON.stringify({ sent: true, to, action, id: result.id }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-rep] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
