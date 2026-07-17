import { Clock, CheckCircle2, XCircle, Calendar, Trophy, Ban, UserMinus } from 'lucide-react'

export const STATUS_CONFIG = {
  pending:        { label: 'Pending Review',   color: 'text-amber-600',   bg: 'bg-amber-50',     border: 'border-amber-200',    icon: Clock,        dot: 'bg-amber-400' },
  qualified:      { label: 'Qualified',        color: 'text-emerald-700', bg: 'bg-emerald-50',   border: 'border-emerald-200',  icon: CheckCircle2, dot: 'bg-emerald-400' },
  declined:       { label: 'Declined',         color: 'text-red-600',     bg: 'bg-red-50',       border: 'border-red-200',      icon: XCircle,      dot: 'bg-red-400' },
  demo_booked:    { label: 'Demo Booked',      color: 'text-violet-700',  bg: 'bg-violet-50',    border: 'border-violet-200',   icon: Calendar,     dot: 'bg-violet-400' },
  // Closing statuses — kept as slugs to match the portal's convention. The scorecard's status
  // matcher normalizes case/underscores/spacing, so these sync correctly (Won / Lost / Lost).
  closed_won:     { label: 'Closed Won',       color: 'text-emerald-700', bg: 'bg-emerald-50',   border: 'border-emerald-200',  icon: Trophy,       dot: 'bg-emerald-500' },
  closed_lost:    { label: 'Closed Lost',      color: 'text-slate-600',   bg: 'bg-slate-100',    border: 'border-slate-300',    icon: Ban,          dot: 'bg-slate-400' },
  closed_churned: { label: 'Closed - Churned', color: 'text-orange-700',  bg: 'bg-orange-50',    border: 'border-orange-200',   icon: UserMinus,    dot: 'bg-orange-400' },
}

export const DEMO_BOOKING_URL = 'https://cal.com/heatheratlas/atlas-channel-partner-30-min-demo'

// Master Agent / TSD options shown in the signup and admin deal-registration flows.
export const TSD_OPTIONS = ['Telarus', 'Sandler', 'Avant', 'Clover', 'Intelisys', 'Other']
