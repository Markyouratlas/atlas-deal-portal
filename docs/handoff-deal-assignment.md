# Handoff: Deal assignment — enable per-person channel-sales filtering (scorecard side)

**For:** the Scorecard (`csm-scorecard`) session. Companion to the portal-side deal-assignment build,
which is **shipped and deployed** (`atlas-deal-portal`). This doc covers the scorecard half. Keep a
copy in both repos.

## Goal

Show each salesperson only their own channel-partner deals. **Omer sells Sandler-sourced deals;
Heather sells the rest.**

## What's live on the portal (done — no further portal work needed)

- New column **`deals.assigned_to`** (text) = the assignee's **Atlas email**, exactly
  `omer@youratlas.com` or `heather@youratlas.com` — the same identity the scorecard authenticates with.
- **Auto-assign rule:** `tsd_name === 'Sandler'` → `omer@youratlas.com`; every other TSD →
  `heather@youratlas.com`. Set on every new deal at registration; admins can override any individual deal.
- **Backfill done:** all existing deals → `heather@youratlas.com` (none are Sandler today).
- The portal→scorecard DB webhook sends the **native full-row payload**, so `record.assigned_to` is
  already flowing to the scorecard now that the column exists.

## Scorecard work items

1. **Add `channel_deals.assigned_to`** (text) and map it through from the webhook payload's
   `record.assigned_to`. No portal change is needed — the column is already in the payload.
2. **Filter each person's channel-sales view** by `channel_deals.assigned_to` = the logged-in user's
   email. It's an **exact email match** to their auth identity — no mapping table, no normalization.
3. **Do NOT clobber `assigned_to` on the Attio write-back.** It is **portal-owned** and never exists in
   Attio. When `attio-webhook` / `attio-sync` updates a `channel_deals` row from an Attio change, do a
   **partial update** (status/value only) so `assigned_to` survives. (The portal's `deal-sync-inbound`
   only ever writes `status`, so it never touches assignment — the only risk is the Attio write-back
   overwriting the full row.)

## Contract summary

| Item | Value |
|---|---|
| Shared key | Atlas email, exact match (`omer@youratlas.com` / `heather@youratlas.com`) |
| New scorecard column | `channel_deals.assigned_to text` |
| Source of assignment | portal (auto by TSD + admin override); never set by Attio or the scorecard |
| Transport | already in the existing DB-webhook full-row payload |
| Write-back rule | partial updates only — never null/overwrite `assigned_to` |

## Confirm on the scorecard side

Omer's and Heather's scorecard auth emails are exactly `omer@youratlas.com` / `heather@youratlas.com`
(a mismatch = empty view for that person).

**No portal blockers** — assignment is fully deployed. The scorecard is clear to add the column and turn
on filtering whenever ready.
