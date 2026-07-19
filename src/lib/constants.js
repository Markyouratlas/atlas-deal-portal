import { Clock, CheckCircle2, XCircle, Calendar, CalendarCheck, PhoneCall, FileText, Trophy, Ban, UserMinus } from 'lucide-react'

// Deal statuses are stored as slugs. The pipeline slugs mirror Attio's stage names 1:1 (see
// docs/phase-b-integration.md) so stage changes sync bidirectionally Attio <-> Scorecard <-> Portal.
// The `emails` field feeds status tooltips: 'submit' = partner emailed on registration, true = emailed
// on this status, false = no email. Order below drives the admin button + filter order.
export const STATUS_CONFIG = {
  // Portal-only review states (no Attio equivalent; never set by sync).
  pending:             { label: 'Pending Review',    color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200',   icon: Clock,        dot: 'bg-amber-400',   emails: 'submit' },
  qualified:           { label: 'Qualified',         color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: CheckCircle2, dot: 'bg-emerald-400', emails: true },
  declined:            { label: 'Declined',          color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200',     icon: XCircle,      dot: 'bg-red-400',     emails: true },
  // Attio pipeline stages (1:1 with Attio stage titles).
  intro_call_pre_demo: { label: 'Intro Call / Pre-Demo', color: 'text-blue-700', bg: 'bg-blue-50',    border: 'border-blue-200',    icon: PhoneCall,    dot: 'bg-blue-400',    emails: false },
  demo_scheduled:      { label: 'Demo scheduled',    color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-200',  icon: Calendar,     dot: 'bg-violet-400',  emails: false },
  demo_complete:       { label: 'Demo complete',     color: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200',  icon: CalendarCheck, dot: 'bg-indigo-400', emails: false },
  poc_proposal_sent:   { label: 'POC proposal sent', color: 'text-cyan-700',    bg: 'bg-cyan-50',     border: 'border-cyan-200',    icon: FileText,     dot: 'bg-cyan-400',    emails: false },
  closed_won:          { label: 'Closed won',        color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: Trophy,       dot: 'bg-emerald-500', emails: false },
  closed_lost:         { label: 'Closed lost',       color: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-300',   icon: Ban,          dot: 'bg-slate-400',   emails: false },
  closed_churned:      { label: 'Closed - Churned',  color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200',  icon: UserMinus,    dot: 'bg-orange-400',  emails: false },
}

const LINKED_NOTE = 'Linked to Attio & the Scorecard: changing this here, or in Attio, updates everywhere automatically.'

// Tooltip shown on every status badge/button: (1) partner-email behavior, (2) the Attio/Scorecard link.
export function statusTooltip(slug) {
  const cfg = STATUS_CONFIG[slug]
  if (!cfg) return ''
  const emailLine =
    cfg.emails === 'submit' ? 'Emails the partner when the deal is first submitted.'
    : cfg.emails === true   ? 'Emails the partner when set to this status.'
    :                         'Does not email the partner.'
  return `${cfg.label} — ${emailLine} ${LINKED_NOTE}`
}

export const DEMO_BOOKING_URL = 'https://cal.com/heatheratlas/atlas-channel-partner-30-min-demo'

// Master Agent / TSD options shown in the signup and admin deal-registration flows.
export const TSD_OPTIONS = ['Telarus', 'Sandler', 'Avant', 'Clover', 'Intelisys', 'Other']

// Deal assignment (deals.assigned_to). The value is the assignee's Atlas email — the same identity
// the scorecard authenticates with, so it can filter each person's view by channel_deals.assigned_to.
// Rule: Sandler-sourced deals go to Omer; everything else to Heather. Admins can override per-deal.
export const ASSIGNEES = { omer: 'omer@youratlas.com', heather: 'heather@youratlas.com' }
export const assigneeForTsd = (tsd) =>
  (tsd || '').trim().toLowerCase() === 'sandler' ? ASSIGNEES.omer : ASSIGNEES.heather
export const assigneeLabel = (email) =>
  email === ASSIGNEES.omer ? 'Omer' : email === ASSIGNEES.heather ? 'Heather' : (email || '—')
