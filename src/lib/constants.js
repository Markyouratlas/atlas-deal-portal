import { Clock, CheckCircle2, XCircle, Calendar } from 'lucide-react'

export const STATUS_CONFIG = {
  pending:      { label: 'Pending Review', color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200',   icon: Clock,        dot: 'bg-amber-400' },
  qualified:    { label: 'Qualified',      color: 'text-emerald-700', bg: 'bg-emerald-50',   border: 'border-emerald-200',  icon: CheckCircle2, dot: 'bg-emerald-400' },
  declined:     { label: 'Declined',       color: 'text-red-600',     bg: 'bg-red-50',       border: 'border-red-200',      icon: XCircle,      dot: 'bg-red-400' },
  demo_booked:  { label: 'Demo Booked',    color: 'text-violet-700',  bg: 'bg-violet-50',    border: 'border-violet-200',   icon: Calendar,     dot: 'bg-violet-400' },
}

export const DEMO_BOOKING_URL = 'https://cal.com/heatheratlas/atlas-channel-partner-30-min-demo'
