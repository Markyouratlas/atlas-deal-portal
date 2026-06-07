import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { StatusBadge, FlagBadge, Input, Button } from './UI'
import { STATUS_CONFIG, DEMO_BOOKING_URL } from '../lib/constants'
import { X, Phone, Shield, Check, Calendar, UserCheck } from 'lucide-react'

export default function DealDetail({ deal, isAdmin, onClose, onUpdate }) {
  const [status, setStatus] = useState(deal.status)
  const [notes, setNotes] = useState(deal.notes || '')
  const [saving, setSaving] = useState(false)

  const saveStatus = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('deals')
      .update({ status, notes, reviewed_by: user?.id || null, reviewed_at: now, updated_at: now })
      .eq('id', deal.id)
    setSaving(false)
    if (!error && onUpdate) onUpdate()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div><h3 className="text-lg font-bold text-slate-800">{deal.business_name}</h3><p className="text-sm text-slate-500">{deal.contact_name} · {deal.contact_email}</p></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex flex-wrap gap-2 items-center">
            <StatusBadge status={deal.status} />
            <span className="text-xs text-slate-400">Submitted {new Date(deal.created_at).toLocaleDateString()}</span>
            <span className="text-xs text-slate-400">· by {deal.partner_company}</span>
          </div>
          {deal.contact_phone && <div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={14} className="text-slate-400" /> {deal.contact_phone}</div>}

          {(deal.tsd_name || deal.rep_name || deal.rep_email || deal.rep_phone) && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-2"><UserCheck size={13} style={{ color: '#6639a6' }} /> TSD & Rep</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {deal.tsd_name && <div><p className="text-xs text-slate-400">Master Agent / TSD</p><p className="text-sm text-slate-700">{deal.tsd_name}</p></div>}
                {deal.rep_name && <div><p className="text-xs text-slate-400">Tech Advisor / Channel Manager</p><p className="text-sm text-slate-700">{deal.rep_name}</p></div>}
                {deal.rep_email && <div><p className="text-xs text-slate-400">Rep Email</p><p className="text-sm text-slate-700">{deal.rep_email}</p></div>}
                {deal.rep_phone && <div><p className="text-xs text-slate-400">Rep Phone</p><p className="text-sm text-slate-700">{deal.rep_phone}</p></div>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Call Volume / Week', value: deal.call_volume, flag: deal.call_volume_flag },
              { label: 'Connects 100% 24/7?', value: deal.connects_100 === 'yes' ? 'Yes' : 'No', flag: deal.connects_100_flag },
              { label: 'Avg Job/Ticket Value', value: deal.avg_value, flag: deal.avg_value_flag },
              { label: 'CRM', value: deal.crm },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                  {item.flag && <FlagBadge flag={item.flag} />}
                </div>
              </div>
            ))}
          </div>

          {deal.connects_100 === 'yes' && deal.connects_100_detail && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-xs font-medium text-amber-700 mb-1">Connects 100% — Detail</p>
              <p className="text-sm text-amber-900">{deal.connects_100_detail}</p>
            </div>
          )}

          {deal.pain_point && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Pain Point</p>
              <p className="text-sm text-slate-700">{deal.pain_point}</p>
            </div>
          )}

          {isAdmin && (
            <div className="pt-3 border-t border-slate-100 space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Shield size={14} style={{ color: '#6639a6' }} /> Admin Actions</h4>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => setStatus(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${status === key ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Internal Notes" value={notes} onChange={setNotes} textarea placeholder="Add notes about this deal..." />
              <div className="flex gap-2">
                <Button onClick={saveStatus} disabled={saving}><Check size={15} /> {saving ? 'Saving...' : 'Save Changes'}</Button>
                {status === 'qualified' && <Button variant="outline" onClick={() => window.open(DEMO_BOOKING_URL, '_blank')}><Calendar size={15} /> Open Demo Calendar</Button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
