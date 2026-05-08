import { Zap, AlertCircle } from 'lucide-react'
import { STATUS_CONFIG } from '../lib/constants'

export function FlagBadge({ flag }) {
  if (flag === 'green') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><Zap size={11} /> Great Fit</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><AlertCircle size={11} /> Needs Review</span>
}

export function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = c.icon
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.color} ${c.border} border`}><Icon size={13} /> {c.label}</span>
}

export function Input({ label, type = 'text', value, onChange, placeholder, required, textarea, hint }) {
  const base = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 transition-all duration-200'
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</span>}
      {hint && <span className="block text-xs text-slate-400 mb-1">{hint}</span>}
      {textarea
        ? <textarea className={base + ' min-h-[90px] resize-y'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <input type={type} className={base} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
    </label>
  )
}

export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', disabled, full }) {
  const variants = {
    primary: 'text-white shadow-sm shadow-violet-300/30',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    ghost: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
    outline: 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }
  const primaryBg = variant === 'primary' ? { background: 'linear-gradient(135deg, #6639a6 0%, #7c4dca 100%)' } : {}
  return (
    <button onClick={onClick} disabled={disabled} style={primaryBg}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 ${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'} ${className}`}>
      {children}
    </button>
  )
}
