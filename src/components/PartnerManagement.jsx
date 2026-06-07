import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { StatusBadge, Button } from './UI'
import { STATUS_CONFIG } from '../lib/constants'
import DealDetail from './DealDetail'
import { ArrowLeft, Search, Users, ChevronRight, ChevronDown, Mail, Phone, Building2, Calendar, Trash2, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react'

const COUNT_KEYS = ['pending', 'qualified', 'declined', 'demo_booked']
const DELETE_USER_URL = 'https://hkpglfdslglrjcgzbqpx.supabase.co/functions/v1/delete-user'

export default function PartnerManagement({ profile, session, onBack }) {
  const [partners, setPartners] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const isSuperAdmin = profile?.role === 'super_admin'

  const load = useCallback(async () => {
    setLoading(true)
    const [partnersRes, dealsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'partner').order('company'),
      supabase.from('deals').select('*').order('created_at', { ascending: false }),
    ])
    // Don't swallow query failures — surface them instead of rendering empty counts.
    if (partnersRes.error) console.error('[PartnerManagement] partners query failed:', partnersRes.error)
    if (dealsRes.error) console.error('[PartnerManagement] deals query failed:', dealsRes.error)

    const partnerRows = partnersRes.data || []
    const dealRows = dealsRes.data || []

    // RLS returns 0 rows (with NO error) when the current role lacks a SELECT policy on
    // public.deals. If partners load but deals come back empty, that's the likely cause.
    if (!dealsRes.error && dealRows.length === 0 && partnerRows.length > 0) {
      console.warn(
        '[PartnerManagement] Loaded %d partners but 0 deals. If deals exist in the DB, the current role (%s) is probably not covered by a SELECT policy on public.deals — update the deals RLS policies to include super_admin.',
        partnerRows.length, profile?.role,
      )
    }

    setPartners(partnerRows)
    setDeals(dealRows)
    setLoadError(dealsRes.error?.message || partnersRes.error?.message || null)
    setLoading(false)
  }, [profile?.role])

  useEffect(() => { load() }, [load])

  // Auto-dismiss the toast after a few seconds.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const partnerLabel = (p) => p.company || p.contact_name || 'this partner'

  const handleDelete = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    const name = partnerLabel(confirmTarget)
    try {
      const res = await fetch(DELETE_USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
        body: JSON.stringify({ userId: confirmTarget.id, callerUserId: profile.id }),
      })
      if (!res.ok) {
        let msg = `Failed to delete ${name}.`
        try { const j = await res.json(); if (j?.error) msg = j.error } catch { /* non-JSON response */ }
        throw new Error(msg)
      }
      setConfirmTarget(null)
      setExpandedId(null)
      await load()
      setToast({ type: 'success', text: `${name} was deleted.` })
    } catch (err) {
      setConfirmTarget(null)
      setToast({ type: 'error', text: err.message || `Failed to delete ${name}.` })
    } finally {
      setDeleting(false)
    }
  }

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

        {loadError && (
          <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>Couldn't load data: {loadError}</span>
          </div>
        )}

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
                  <div className="flex items-center hover:bg-slate-50 transition-colors">
                    <button onClick={() => setExpandedId(expanded ? null : p.id)} className="flex-1 min-w-0 text-left p-4 flex items-center gap-3">
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
                    {isSuperAdmin && (
                      <button onClick={() => setConfirmTarget(p)} title="Delete partner"
                        className="mr-3 ml-1 p-2 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

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

      {/* Delete confirmation modal */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setConfirmTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4"><AlertTriangle size={20} className="text-red-600" /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-1.5">Delete partner?</h3>
              <p className="text-sm text-slate-500">
                Are you sure you want to delete <span className="font-semibold text-slate-700">{partnerLabel(confirmTarget)}</span>? This will remove their account and all their deals.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmTarget(null)} disabled={deleting}>Cancel</Button>
              <button onClick={handleDelete} disabled={deleting}
                className="inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2.5 text-sm bg-red-600 text-white transition-all hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {deleting ? <><Loader2 size={15} className="animate-spin" /> Deleting...</> : <><Trash2 size={15} /> Delete Partner</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {toast.text}
        </div>
      )}
    </div>
  )
}
