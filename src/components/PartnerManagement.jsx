import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { StatusBadge } from './UI'
import { STATUS_CONFIG } from '../lib/constants'
import DealDetail from './DealDetail'
import { ArrowLeft, Search, Users, ChevronRight, ChevronDown, Mail, Phone, Building2, Calendar } from 'lucide-react'

const COUNT_KEYS = ['pending', 'qualified', 'declined', 'demo_booked']

export default function PartnerManagement({ profile, onBack }) {
  const [partners, setPartners] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [selectedDeal, setSelectedDeal] = useState(null)

  const load = useCallback(async () => {
    const [{ data: profileData }, { data: dealData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'partner').order('company'),
      supabase.from('deals').select('*').order('created_at', { ascending: false }),
    ])
    setPartners(profileData || [])
    setDeals(dealData || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const dealsFor = (partnerId) => deals.filter(d => d.partner_id === partnerId)
  const countsFor = (partnerId) => {
    const ds = dealsFor(partnerId)
    const counts = { total: ds.length }
    COUNT_KEYS.forEach(k => { counts[k] = ds.filter(d => d.status === k).length })
    return counts
  }

  const q = search.toLowerCase()
  const filtered = partners.filter(p => !q || (p.company || '').toLowerCase().includes(q) || (p.contact_name || '').toLowerCase().includes(q))

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><ArrowLeft size={20} /></button>
        <div className="flex-1"><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users size={22} style={{ color: '#7c3aed' }} /> Partner Management</h1><p className="text-sm text-slate-500 mt-0.5">All channel partner accounts and their deals</p></div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-sm font-bold text-slate-800">{loading ? 'Partners' : `${filtered.length} Partner${filtered.length === 1 ? '' : 's'}`}</h2>
          <div className="relative sm:ml-auto w-full sm:w-auto"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-full sm:w-64" placeholder="Search by name or company..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>

        {loading ? (
          <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-slate-200 border-t-atlas-600 rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center"><p className="text-sm text-slate-500">{partners.length === 0 ? 'No partner accounts yet.' : 'No partners match your search.'}</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(p => {
              const counts = countsFor(p.id)
              const expanded = expandedId === p.id
              const partnerDeals = dealsFor(p.id)
              return (
                <div key={p.id}>
                  <button onClick={() => setExpandedId(expanded ? null : p.id)} className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center gap-3">
                    {expanded ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-300 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.company || '(no company)'}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-0.5">
                        <span>{p.contact_name}</span>
                        {p.tsd_name && <span className="inline-flex items-center gap-1">· TSD: {p.tsd_name}</span>}
                        {p.email && <span className="hidden sm:inline-flex items-center gap-1"><Mail size={11} /> {p.email}</span>}
                        {p.phone && <span className="hidden sm:inline-flex items-center gap-1"><Phone size={11} /> {p.phone}</span>}
                        <span className="inline-flex items-center gap-1"><Calendar size={11} /> {new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{counts.total} total</span>
                      {COUNT_KEYS.filter(k => counts[k] > 0).map(k => (
                        <span key={k} className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[k].bg} ${STATUS_CONFIG[k].color}`}>{counts[k]} {STATUS_CONFIG[k].label}</span>
                      ))}
                    </div>
                  </button>

                  {expanded && (
                    <div className="bg-slate-50/60 border-t border-slate-100 px-4 py-3">
                      {/* contact details (mobile-friendly, since hidden in header on small screens) */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-3 sm:hidden">
                        {p.email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {p.email}</span>}
                        {p.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {p.phone}</span>}
                      </div>
                      {partnerDeals.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">No deals registered yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {partnerDeals.map(deal => (
                            <button key={deal.id} onClick={() => setSelectedDeal(deal)} className="w-full text-left p-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all flex items-center gap-3">
                              <Building2 size={14} className="text-slate-300 shrink-0" />
                              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{deal.business_name}</p><p className="text-xs text-slate-400">{deal.contact_name} · {new Date(deal.created_at).toLocaleDateString()}</p></div>
                              <StatusBadge status={deal.status} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedDeal && <DealDetail deal={selectedDeal} isAdmin={true} onClose={() => setSelectedDeal(null)} onUpdate={load} />}
    </div>
  )
}
