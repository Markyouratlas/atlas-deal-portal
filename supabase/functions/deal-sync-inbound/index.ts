// =====================================================
// Atlas Deal Portal — deal-sync-inbound Edge Function
//
// Down-sync hop of the Attio <-> Scorecard <-> Portal ring (Phase B).
// Receives a Supabase DB-webhook event from the scorecard's `channel_deals`
// table and UPDATEs the matching portal `deals` row by id — status only (v1),
// write-if-changed (this compare-and-skip is the loop guard).
//
// Contract: docs/phase-b-integration.md
//
// Deploy:  supabase functions deploy deal-sync-inbound
//          (verify_jwt=false is set in supabase/config.toml)
// Secrets:
//   SYNC_SECRET                  required — shared secret; scorecard sends it as X-Sync-Secret
//   SUPABASE_URL                 auto-provided in the function runtime
//   SUPABASE_SERVICE_ROLE_KEY    auto-provided — used to read/write deals past RLS
//
// Invoked by the scorecard's DB webhook with the native payload:
//   { type: "INSERT"|"UPDATE"|"DELETE", table, schema, record, old_record }
// where `record` is the channel_deals row. We only act on portal-origin rows
// (record.origin === 'portal'); native Attio deals no-op (their id isn't in `deals`).
// =====================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SYNC_SECRET = Deno.env.get("SYNC_SECRET") ?? "";

// Valid portal status slugs (must match the deals_status_check constraint).
const KNOWN_STATUSES = new Set([
  "pending", "qualified", "declined",
  "intro_call_pre_demo", "demo_scheduled", "demo_complete", "poc_proposal_sent",
  "closed_won", "closed_lost", "closed_churned",
]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // --- Auth: shared secret ---
  if (!SYNC_SECRET) return json({ error: "SYNC_SECRET not configured" }, 500);
  if (req.headers.get("x-sync-secret") !== SYNC_SECRET) return json({ error: "unauthorized" }, 401);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const { type, record } = payload ?? {};

  // Only row upserts carry a new status; deletes are no-ops for the portal.
  if (type === "DELETE") return json({ updated: false, reason: "delete ignored" });
  if (!record || typeof record !== "object") return json({ updated: false, reason: "no record" });

  // Only portal-originated deals ever sync down. Native Attio deals stay in the scorecard.
  if (record.origin !== "portal") return json({ updated: false, reason: "not portal origin" });

  const id = record.id;
  const newStatus = record.status;
  if (!id) return json({ updated: false, reason: "no id" });
  if (!newStatus || !KNOWN_STATUSES.has(newStatus)) {
    console.log(`[deal-sync-inbound] skip id=${id}: unknown status ${JSON.stringify(newStatus)}`);
    return json({ updated: false, reason: "unknown status" });
  }

  // --- Write-if-changed against the PORTAL row (this compare-and-skip stops the ring) ---
  const { data: existing, error: selErr } = await supabase
    .from("deals").select("status").eq("id", id).maybeSingle();
  if (selErr) return json({ error: `lookup failed: ${selErr.message}` }, 500);
  if (!existing) return json({ updated: false, reason: "id not found in deals" }); // native Attio deal
  if (existing.status === newStatus) return json({ updated: false, reason: "already in sync" });

  const { error: updErr } = await supabase
    .from("deals")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) return json({ error: `update failed: ${updErr.message}` }, 500);

  console.log(`[deal-sync-inbound] deal ${id}: ${existing.status} -> ${newStatus}`);
  return json({ updated: true, id, from: existing.status, to: newStatus });
});
