import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Input } from './UI'
import {
  ShieldCheck, Shield, Search, ChevronRight, ChevronDown, Mail, Lock, Unlock,
  KeyRound, Trash2, UserPlus, AlertTriangle, Loader2, CheckCircle2, XCircle, ExternalLink, Check,
} from 'lucide-react'

const DELETE_USER_URL = 'https://hkpglfdslglrjcgzbqpx.supabase.co/functions/v1/delete-user'
const RESET_REDIRECT = 'https://deals.youratlas.com'
const selectBase = 'px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 transition-all'

function RoleBadge({ role }) {
  if (role === 'super_admin') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700"><ShieldCheck size={12} /> Super Admin</span>
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600"><Shield size={12} /> Admin</span>
}

export default function AdminManagement({ profile, session }) {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [toast, setToast] = useState(null)

  // calendar inline edit (for the currently expanded admin)
  const [calDraft, setCalDraft] = useState('')
  const [calSaving, setCalSaving] = useState(false)

  // confirmation modals
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmLock, setConfirmLock] = useState(null)
  const [busy, setBusy] = useState(false)

  // add-admin modal
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', name: '', company: '', calendar_url: '', role: 'admin' })
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').in('role', ['admin', 'super_admin']).order('created_at')
    if (error) setToast({ type: 'error', text: error.message })
    setAdmins(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const ok = (text) => setToast({ type: 'success', text })
  const fail = (text) => setToast({ type: 'error', text })

  const expand = (a) => {
    if (expandedId === a.id) { setExpandedId(null); return }
    setExpandedId(a.id)
    setCalDraft(a.calendar_url || '')
  }

  const saveCalendar = async (a) => {
    setCalSaving(true)
    const { error } = await supabase.from('profiles').update({ calendar_url: calDraft.trim() }).eq('id', a.id)
    setCalSaving(false)
    if (error) return fail(error.message)
    ok('Calendar link updated.')
    load()
  }

  const sendReset = async (a) => {
    const { error } = await supabase.auth.resetPasswordForEmail(a.email, { redirectTo: RESET_REDIRECT })
    if (error) return fail(error.message)
    ok(`Password reset email sent to ${a.email}.`)
  }

  const changeRole = async (a, role) => {
    if (a.id === profile.id) return fail("You can't change your own role.")
    const { error } = await supabase.from('profiles').update({ role }).eq('id', a.id)
    if (error) return fail(error.message)
    ok(`${a.contact_name || a.email} is now ${role === 'super_admin' ? 'Super Admin' : 'Admin'}.`)
    load()
  }

  const toggleLock = async () => {
    const a = confirmLock
    if (!a) return
    const next = !a.locked
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ locked: next }).eq('id', a.id)
    setBusy(false)
    setConfirmLock(null)
    if (error) return fail(error.message)
    ok(`${a.contact_name || a.email} ${next ? 'locked' : 'unlocked'}.`)
    load()
  }

  const handleDelete = async () => {
    const a = confirmDelete
    if (!a) return
    setBusy(true)
    const name = a.contact_name || a.email
    try {
      const res = await fetch(DELETE_USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
        body: JSON.stringify({ userId: a.id, callerUserId: profile.id }),
      })
      if (!res.ok) {
        let msg = `Failed to delete ${name}.`
        try { const j = await res.json(); if (j?.error) msg = j.error } catch { /* non-JSON */ }
        throw new Error(msg)
      }
      setConfirmDelete(null)
      setExpandedId(null)
      await load()
      ok(`${name} was deleted.`)
    } catch (err) {
      setConfirmDelete(null)
      fail(err.message || `Failed to delete ${name}.`)
    } finally {
      setBusy(false)
    }
  }

  const setAdd = (k, v) => setAddForm(f => ({ ...f, [k]: v }))
  const resetAdd = () => setAddForm({ email: '', name: '', company: '', calendar_url: '', role: 'admin' })

  const handleAdd = async () => {
    const email = addForm.email.trim().toLowerCase()
    if (!email) return fail('Email is required.')
    setAdding(true)
    const { data: existing } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle()
    if (existing) {
      const updates = { role: addForm.role }
      if (addForm.name.trim()) updates.contact_name = addForm.name.trim()
      if (addForm.company.trim()) updates.company = addForm.company.trim()
      if (addForm.calendar_url.trim()) updates.calendar_url = addForm.calendar_url.trim()
      const { error } = await supabase.from('profiles').update(updates).eq('id', existing.id)
      setAdding(false)
      if (error) return fail(error.message)
      setShowAdd(false); resetAdd()
      ok(`${email} is now ${addForm.role === 'super_admin' ? 'Super Admin' : 'Admin'}.`)
      load()
    } else {
      // No account yet — send an invite (password setup) email; promote once they've signed up.
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: RESET_REDIRECT })
      setAdding(false)
      setShowAdd(false); resetAdd()
      if (error) return fail(error.message)
      ok(`No account yet for ${email} — invite sent. Promote them here once they sign up.`)
    }
  }

  const q = search.toLowerCase()
  const filtered = admins.filter(a => !q || (a.contact_name || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q))

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShieldCheck size={22} style={{ color: '#7c3aed' }} /> Manage Admins</h1>
          <p className="text-sm text-slate-500 mt-0.5">Add, promote, lock, or remove admin accounts.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><UserPlus size={16} /> Add Admin</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-sm font-bold text-slate-800">{loading ? 'Admins' : `${filtered.length} Admin${filtered.length === 1 ? '' : 's'}`}</h2>
          <div className="relative sm:ml-auto w-full sm:w-auto"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-full sm:w-64" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>

        {loading ? (
          <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-slate-200 border-t-atlas-600 rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center"><p className="text-sm text-slate-500">{admins.length === 0 ? 'No admin accounts yet.' : 'No admins match your search.'}</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(a => {
              const expanded = expandedId === a.id
              const isSelf = a.id === profile.id
              return (
                <div key={a.id}>
                  <button onClick={() => expand(a)} className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                    {expanded ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-300 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 truncate">{a.contact_name || '(no name)'}</p>
                        {isSelf && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">You</span>}
                      </div>
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1"><Mail size={11} /> {a.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.locked
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><Lock size={11} /> Locked</span>
                        : <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600"><Unlock size={11} /> Active</span>}
                      <RoleBadge role={a.role} />
                    </div>
                  </button>

                  {expanded && (
                    <div className="bg-slate-50/60 border-t border-slate-100 px-4 py-4 space-y-4">
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                        <span><span className="text-slate-400">Joined:</span> {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</span>
                        <span className="flex items-center gap-1"><span className="text-slate-400">Calendar:</span> {a.calendar_url
                          ? <a href={a.calendar_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline inline-flex items-center gap-1 break-all">{a.calendar_url} <ExternalLink size={11} /></a>
                          : <span className="text-slate-400">not set</span>}</span>
                      </div>

                      {/* a) Edit calendar URL */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1.5">Calendar URL</p>
                        <div className="flex items-end gap-2 flex-wrap">
                          <div className="flex-1 min-w-[220px]"><Input type="url" value={calDraft} onChange={setCalDraft} placeholder="https://cal.com/handle/intro" /></div>
                          <Button size="sm" onClick={() => saveCalendar(a)} disabled={calSaving || calDraft.trim() === (a.calendar_url || '')}><Check size={14} /> {calSaving ? 'Saving...' : 'Save'}</Button>
                        </div>
                      </div>

                      {/* d) Change role */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1.5">Role</p>
                        <select className={selectBase} value={a.role} disabled={isSelf} onChange={e => changeRole(a, e.target.value)}>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                        {isSelf && <span className="ml-2 text-xs text-slate-400">You can't change your own role.</span>}
                      </div>

                      {/* b, c, e) Actions */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={() => sendReset(a)}><KeyRound size={14} /> Send Password Reset</Button>
                        <Button variant="outline" size="sm" onClick={() => setConfirmLock(a)} disabled={isSelf}>
                          {a.locked ? <><Unlock size={14} /> Unlock Account</> : <><Lock size={14} /> Lock Account</>}
                        </Button>
                        <button onClick={() => setConfirmDelete(a)} disabled={isSelf}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                          <Trash2 size={14} /> Delete Admin
                        </button>
                      </div>
                      {isSelf && <p className="text-xs text-slate-400">Lock and delete are disabled for your own account.</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Admin modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => !adding && setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserPlus size={18} style={{ color: '#6639a6' }} /> Add Admin</h3>
                <p className="text-xs text-slate-400 mt-1">If this person already has an account, they'll be promoted immediately. If not, we'll email them an invite — promote them here once they've signed up.</p>
              </div>
              <Input label="Email" type="email" value={addForm.email} onChange={v => setAdd('email', v)} placeholder="person@youratlas.com" required />
              <Input label="Name" value={addForm.name} onChange={v => setAdd('name', v)} placeholder="Full name" />
              <Input label="Company" value={addForm.company} onChange={v => setAdd('company', v)} placeholder="Atlas" />
              <Input label="Calendar URL" type="url" value={addForm.calendar_url} onChange={v => setAdd('calendar_url', v)} placeholder="https://cal.com/handle/intro" />
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1.5">Role</span>
                <select className={selectBase + ' w-full'} value={addForm.role} onChange={e => setAdd('role', e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </label>
            </div>
            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowAdd(false); resetAdd() }} disabled={adding}>Cancel</Button>
              <Button onClick={handleAdd} disabled={adding}>{adding ? <><Loader2 size={15} className="animate-spin" /> Working...</> : <><UserPlus size={15} /> Add Admin</>}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Lock/unlock confirmation */}
      {confirmLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => !busy && setConfirmLock(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center mb-4">{confirmLock.locked ? <Unlock size={20} className="text-amber-600" /> : <Lock size={20} className="text-amber-600" />}</div>
              <h3 className="text-lg font-bold text-slate-800 mb-1.5">{confirmLock.locked ? 'Unlock account?' : 'Lock account?'}</h3>
              <p className="text-sm text-slate-500">
                {confirmLock.locked
                  ? <>Restore access for <span className="font-semibold text-slate-700">{confirmLock.contact_name || confirmLock.email}</span>? They'll be able to sign in again.</>
                  : <>Lock <span className="font-semibold text-slate-700">{confirmLock.contact_name || confirmLock.email}</span>? They'll be blocked from signing in until unlocked.</>}
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmLock(null)} disabled={busy}>Cancel</Button>
              <Button onClick={toggleLock} disabled={busy}>{busy ? <><Loader2 size={15} className="animate-spin" /> Working...</> : (confirmLock.locked ? <><Unlock size={15} /> Unlock</> : <><Lock size={15} /> Lock</>)}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => !busy && setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4"><AlertTriangle size={20} className="text-red-600" /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-1.5">Delete admin?</h3>
              <p className="text-sm text-slate-500">Are you sure you want to delete <span className="font-semibold text-slate-700">{confirmDelete.contact_name || confirmDelete.email}</span>? This permanently removes their account and any deals attributed to them.</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={busy}>Cancel</Button>
              <button onClick={handleDelete} disabled={busy}
                className="inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2.5 text-sm bg-red-600 text-white transition-all hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {busy ? <><Loader2 size={15} className="animate-spin" /> Deleting...</> : <><Trash2 size={15} /> Delete Admin</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border max-w-sm ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <XCircle size={16} className="shrink-0" />}
          {toast.text}
        </div>
      )}
    </div>
  )
}
