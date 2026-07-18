import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Button, StatusBadge } from './UI'
import { STATUS_CONFIG, DEMO_BOOKING_URL } from '../lib/constants'
import DealForm from './DealForm'
import DealDetail from './DealDetail'
import { Plus, Search, FileText, ChevronRight, Clock, CheckCircle2, Calendar, ExternalLink } from 'lucide-react'

export default function PartnerDashboard({ profile, onNavigate }) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [searchTerm, setSearch] = useState('')

  const loadDeals = useCallback(async () => {
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('partner_id', profile.id)
      .order('created_at', { ascending: false })
    setDeals(data || [])
    setLoading(false)
  }, [profile.id])

  useEffect(() => { loadDeals() }, [loadDeals])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('partner-deals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals', filter: `partner_id=eq.${profile.id}` }, () => loadDeals())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile.id, loadDeals])

  if (showForm) return <div className="p-4 sm:p-8"><DealForm profile={profile} onCancel={() => setShowForm(false)} onSuccess={() => { setShowForm(false); loadDeals() }} /></div>

  const filtered = deals.filter(d => d.business_name.toLowerCase().includes(searchTerm.toLowerCase()) || d.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
  const stats = { total: deals.length, pending: deals.filter(d => d.status === 'pending').length, qualified: deals.filter(d => d.status === 'qualified' || d.status === 'demo_scheduled').length }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div><h1 className="text-2xl font-bold text-slate-800">Welcome back, {(profile.contact_name || '').split(' ')[0]}</h1><p className="text-sm text-slate-500 mt-0.5">{profile.company}</p></div>
        <Button onClick={() => setShowForm(true)} size="lg"><Plus size={18} /> Register a Deal</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[{ label: 'Total Deals', value: stats.total, icon: FileText, color: '#6639a6', bg: 'rgba(102,57,166,0.08)' }, { label: 'Pending', value: stats.pending, icon: Clock, color: '#d97706', bg: 'rgba(217,119,6,0.08)' }, { label: 'Qualified', value: stats.qualified, icon: CheckCircle2, color: '#059669', bg: 'rgba(5,150,105,0.08)' }].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: s.bg }}><s.icon size={16} style={{ color: s.color }} /></div>
            <p className="text-2xl font-bold text-slate-800">{loading ? '—' : s.value}</p><p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-sm font-bold text-slate-800">Your Deal Registrations</h2>
          <div className="relative sm:ml-auto"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-full sm:w-64" placeholder="Search deals..." value={searchTerm} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        {loading ? (
          <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-slate-200 border-t-atlas-600 rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><FileText size={24} className="text-slate-300" /></div>
            <p className="text-sm font-medium text-slate-500 mb-1">{deals.length === 0 ? 'No deals yet' : 'No matches'}</p>
            <p className="text-xs text-slate-400 mb-4">{deals.length === 0 ? 'Register your first deal to get started' : 'Try a different search term'}</p>
            {deals.length === 0 && <Button onClick={() => setShowForm(true)} size="sm"><Plus size={14} /> Register a Deal</Button>}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">{filtered.map(deal => (
            <button key={deal.id} onClick={() => setSelectedDeal(deal)} className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_CONFIG[deal.status]?.dot}`} />
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{deal.business_name}</p><p className="text-xs text-slate-400">{deal.contact_name} · {new Date(deal.created_at).toLocaleDateString()}</p></div>
              <StatusBadge status={deal.status} /><ChevronRight size={16} className="text-slate-300 shrink-0 hidden sm:block" />
            </button>
          ))}</div>
        )}
      </div>

      {stats.qualified > 0 && (
        <div className="mt-6 p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-4" style={{ background: 'rgba(102,57,166,0.04)', borderColor: 'rgba(102,57,166,0.15)' }}>
          <div className="flex-1"><p className="text-sm font-semibold" style={{ color: '#3d1f6e' }}>You have {stats.qualified} qualified deal{stats.qualified > 1 ? 's' : ''}!</p><p className="text-xs mt-0.5" style={{ color: '#6639a6' }}>Book a demo with Heather to move them forward.</p></div>
          <Button onClick={() => window.open(DEMO_BOOKING_URL, '_blank')} size="sm"><Calendar size={14} /> Book Demo <ExternalLink size={12} /></Button>
        </div>
      )}

      {selectedDeal && <DealDetail deal={selectedDeal} isAdmin={false} onClose={() => setSelectedDeal(null)} onUpdate={loadDeals} />}
    </div>
  )
}
