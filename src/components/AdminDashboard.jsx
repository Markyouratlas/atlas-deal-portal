import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Button, StatusBadge, FlagBadge } from './UI'
import { STATUS_CONFIG } from '../lib/constants'
import DealForm from './DealForm'
import DealDetail from './DealDetail'
import PartnerManagement from './PartnerManagement'
import { Plus, Search, FileText, Clock, CheckCircle2, Users } from 'lucide-react'

export default function AdminDashboard({ profile, session, onNavigate }) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showPartners, setShowPartners] = useState(false)

  const loadDeals = useCallback(async () => {
    const { data } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
    setDeals(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadDeals() }, [loadDeals])

  // Real-time subscription for all deals
  useEffect(() => {
    const channel = supabase
      .channel('admin-deals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => loadDeals())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadDeals])

  if (showForm) return <div className="p-4 sm:p-8"><DealForm profile={profile} onCancel={() => setShowForm(false)} onSuccess={() => { setShowForm(false); loadDeals() }} /></div>
  if (showPartners) return <PartnerManagement profile={profile} session={session} onBack={() => setShowPartners(false)} />

  const filtered = deals.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (searchTerm && !d.business_name.toLowerCase().includes(searchTerm.toLowerCase()) && !d.partner_company.toLowerCase().includes(searchTerm.toLowerCase()) && !d.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })
  const stats = { total: deals.length, pending: deals.filter(d => d.status === 'pending').length, qualified: deals.filter(d => d.status === 'qualified').length, partners: new Set(deals.map(d => d.partner_id)).size }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div><h1 className="text-2xl font-bold text-slate-800">Deal Pipeline</h1><p className="text-sm text-slate-500 mt-0.5">All channel partner deal registrations</p></div>
        <Button onClick={() => setShowForm(true)}><Plus size={16} /> Register Deal</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Deals', value: stats.total, icon: FileText, color: '#6639a6', bg: 'rgba(102,57,166,0.08)', action: () => { setShowPartners(false); setStatusFilter('all') }, active: !showPartners && statusFilter === 'all' },
          { label: 'Pending Review', value: stats.pending, icon: Clock, color: '#d97706', bg: 'rgba(217,119,6,0.08)', action: () => { setShowPartners(false); setStatusFilter('pending') }, active: !showPartners && statusFilter === 'pending' },
          { label: 'Qualified', value: stats.qualified, icon: CheckCircle2, color: '#059669', bg: 'rgba(5,150,105,0.08)', action: () => { setShowPartners(false); setStatusFilter('qualified') }, active: !showPartners && statusFilter === 'qualified' },
          { label: 'Active Partners', value: stats.partners, icon: Users, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', action: () => setShowPartners(true), active: showPartners },
        ].map((s, i) => (
          <button key={i} onClick={s.action}
            className={`text-left bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300 cursor-pointer ${s.active ? 'ring-2 ring-offset-1' : 'border-slate-200'}`}
            style={s.active ? { borderColor: s.color, '--tw-ring-color': s.color } : {}}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: s.bg }}><s.icon size={16} style={{ color: s.color }} /></div>
            <p className="text-2xl font-bold text-slate-800">{loading ? '—' : s.value}</p><p className="text-xs text-slate-400">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[{ key: 'all', label: 'All' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={statusFilter === f.key ? { background: 'rgba(102,57,166,0.08)', borderColor: 'rgba(102,57,166,0.25)', color: '#6639a6' } : { borderColor: '#e2e8f0', color: '#94a3b8' }}>
                {f.label} ({f.key === 'all' ? deals.length : deals.filter(d => d.status === f.key).length})
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto w-full sm:w-auto"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-full sm:w-64" placeholder="Search deals or partners..." value={searchTerm} onChange={e => setSearch(e.target.value)} /></div>
        </div>

        {loading ? (
          <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-slate-200 border-t-atlas-600 rounded-full animate-spin mx-auto" /></div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full"><thead><tr className="text-xs text-slate-400 font-medium border-b border-slate-100"><th className="text-left p-3 pl-4">Business</th><th className="text-left p-3">Partner</th><th className="text-left p-3">Volume</th><th className="text-left p-3">Value</th><th className="text-left p-3">Status</th><th className="text-left p-3">Date</th></tr></thead>
                <tbody className="divide-y divide-slate-50">{filtered.map(deal => (
                  <tr key={deal.id} onClick={() => setSelectedDeal(deal)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="p-3 pl-4"><p className="text-sm font-semibold text-slate-800">{deal.business_name}</p><p className="text-xs text-slate-400">{deal.contact_name}</p></td>
                    <td className="p-3 text-sm text-slate-600">{deal.partner_company}</td>
                    <td className="p-3"><span className="text-sm text-slate-600">{deal.call_volume}</span> <FlagBadge flag={deal.call_volume_flag} /></td>
                    <td className="p-3"><span className="text-sm text-slate-600">{deal.avg_value}</span> <FlagBadge flag={deal.avg_value_flag} /></td>
                    <td className="p-3"><StatusBadge status={deal.status} /></td>
                    <td className="p-3 text-sm text-slate-400">{new Date(deal.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-slate-100">{filtered.map(deal => (
              <button key={deal.id} onClick={() => setSelectedDeal(deal)} className="w-full text-left p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-1.5"><p className="text-sm font-semibold text-slate-800 truncate">{deal.business_name}</p><StatusBadge status={deal.status} /></div>
                <p className="text-xs text-slate-400">{deal.partner_company} · {new Date(deal.created_at).toLocaleDateString()}</p>
                <div className="flex gap-3 mt-2"><span className="text-xs text-slate-500">Vol: {deal.call_volume}</span><span className="text-xs text-slate-500">Val: {deal.avg_value}</span></div>
              </button>
            ))}</div>
            {filtered.length === 0 && <div className="p-12 text-center"><p className="text-sm text-slate-500">No deals match your filters.</p></div>}
          </>
        )}
      </div>

      {selectedDeal && <DealDetail deal={selectedDeal} isAdmin={true} onClose={() => setSelectedDeal(null)} onUpdate={loadDeals} />}
    </div>
  )
}
