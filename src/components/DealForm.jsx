import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Input, Button, FlagBadge } from './UI'
import { ArrowLeft, ArrowRight, Building2, Send, AlertCircle } from 'lucide-react'

export default function DealForm({ profile, onCancel, onSuccess }) {
  const [form, setForm] = useState({ business_name: '', contact_name: '', contact_email: '', contact_phone: '', call_volume: '', call_volume_flag: '', connects_100: '', connects_100_flag: '', connects_100_detail: '', avg_value: '', avg_value_flag: '', crm: '', pain_point: '' })
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validateStep1 = () => { const e = {}; if (!form.business_name.trim()) e.business_name = true; if (!form.contact_name.trim()) e.contact_name = true; if (!form.contact_email.trim()) e.contact_email = true; setErrors(e); return Object.keys(e).length === 0 }
  const validateStep2 = () => { const e = {}; if (!form.call_volume.trim()) e.call_volume = true; if (!form.connects_100) e.connects_100 = true; if (!form.avg_value.trim()) e.avg_value = true; if (!form.crm.trim()) e.crm = true; setErrors(e); return Object.keys(e).length === 0 }

  useEffect(() => { const v = form.call_volume.replace(/[^0-9]/g, ''); if (v) set('call_volume_flag', parseInt(v) >= 50 ? 'green' : 'red') }, [form.call_volume])
  useEffect(() => { if (form.connects_100 === 'no') set('connects_100_flag', 'green'); else if (form.connects_100 === 'yes') set('connects_100_flag', 'red') }, [form.connects_100])
  useEffect(() => { const v = form.avg_value.replace(/[^0-9]/g, ''); if (v) set('avg_value_flag', parseInt(v) >= 1000 ? 'green' : 'red') }, [form.avg_value])

  const submit = async () => {
    if (!validateStep2()) return
    setSubmitting(true)
    const { error } = await supabase.from('deals').insert({
      partner_id: profile.id,
      partner_company: profile.company,
      partner_contact: profile.contact_name,
      business_name: form.business_name,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      call_volume: form.call_volume,
      call_volume_flag: form.call_volume_flag,
      connects_100: form.connects_100,
      connects_100_flag: form.connects_100_flag,
      connects_100_detail: form.connects_100_detail,
      avg_value: form.avg_value,
      avg_value_flag: form.avg_value_flag,
      crm: form.crm,
      pain_point: form.pain_point,
      status: 'pending',
    })
    setSubmitting(false)
    if (error) { setErrors({ submit: error.message }); return }
    onSuccess()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><ArrowLeft size={20} /></button>
        <div><h2 className="text-xl font-bold text-slate-800">Register a New Deal</h2><p className="text-sm text-slate-500">Step {step} of 2 — {step === 1 ? 'Business Details' : 'Qualification Questions'}</p></div>
      </div>
      <div className="flex gap-2 mb-8">{[1, 2].map(s => <div key={s} className="h-1.5 flex-1 rounded-full transition-all duration-500" style={{ background: s <= step ? '#6639a6' : '#e2e8f0' }} />)}</div>

      {errors.submit && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex gap-2"><AlertCircle size={14} className="shrink-0 mt-0.5" />{errors.submit}</div>}

      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Building2 size={16} style={{ color: '#6639a6' }} /> Business Information</h3>
          <Input label="Business Name" value={form.business_name} onChange={v => set('business_name', v)} placeholder="e.g. Apex Roofing & Construction" required />
          {errors.business_name && <p className="text-xs text-red-500 -mt-2">Required</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Input label="Contact Name" value={form.contact_name} onChange={v => set('contact_name', v)} placeholder="Decision maker" required />{errors.contact_name && <p className="text-xs text-red-500">Required</p>}</div>
            <div><Input label="Contact Email" type="email" value={form.contact_email} onChange={v => set('contact_email', v)} placeholder="email@company.com" required />{errors.contact_email && <p className="text-xs text-red-500">Required</p>}</div>
          </div>
          <Input label="Contact Phone" type="tel" value={form.contact_phone} onChange={v => set('contact_phone', v)} placeholder="555-555-0000" />
          <div className="flex justify-end pt-2"><Button onClick={() => { if (validateStep1()) setStep(2) }}>Continue <ArrowRight size={15} /></Button></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex-1"><p className="text-sm font-semibold text-slate-800 mb-1">1. What's the business's inbound call volume or lead volume?</p><p className="text-xs text-slate-400 mb-3">Green light: more than 50/week</p><Input value={form.call_volume} onChange={v => set('call_volume', v)} placeholder="e.g. 150/week" required />{errors.call_volume && <p className="text-xs text-red-500 mt-1">Required</p>}</div>{form.call_volume_flag && <div className="pt-6"><FlagBadge flag={form.call_volume_flag} /></div>}</div></div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex-1"><p className="text-sm font-semibold text-slate-800 mb-1">2. Does the business connect with 100% of callers/leads instantly, 24/7?</p><p className="text-xs text-slate-400 mb-3">Green light: If "No" — Atlas can help!</p><div className="flex gap-2">{['no', 'yes'].map(v => <button key={v} onClick={() => set('connects_100', v)} className={`px-5 py-2 rounded-lg text-sm font-semibold border transition-all ${form.connects_100 === v ? (v === 'no' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700') : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>{v === 'no' ? 'No' : 'Yes'}</button>)}</div>{errors.connects_100 && <p className="text-xs text-red-500 mt-1">Required</p>}{form.connects_100 === 'yes' && <div className="mt-3"><Input label="Please explain how" value={form.connects_100_detail} onChange={v => set('connects_100_detail', v)} placeholder="e.g. They use a 24/7 answering service..." textarea /></div>}</div>{form.connects_100_flag && <div className="pt-6"><FlagBadge flag={form.connects_100_flag} /></div>}</div></div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex-1"><p className="text-sm font-semibold text-slate-800 mb-1">3. What's the business's average job, client, or ticket value?</p><p className="text-xs text-slate-400 mb-3">Green light: more than $1,000</p><Input value={form.avg_value} onChange={v => set('avg_value', v)} placeholder="e.g. $4,500" required />{errors.avg_value && <p className="text-xs text-red-500 mt-1">Required</p>}</div>{form.avg_value_flag && <div className="pt-6"><FlagBadge flag={form.avg_value_flag} /></div>}</div></div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"><p className="text-sm font-semibold text-slate-800 mb-1">4. What CRM are they using now?</p><div className="mt-2"><Input value={form.crm} onChange={v => set('crm', v)} placeholder="e.g. HubSpot, Salesforce, ServiceTitan..." required /></div>{errors.crm && <p className="text-xs text-red-500 mt-1">Required</p>}</div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"><p className="text-sm font-semibold text-slate-800 mb-1">5. What pain point are they trying to solve? <span className="text-slate-400 font-normal">(optional)</span></p><div className="mt-2"><Input value={form.pain_point} onChange={v => set('pain_point', v)} placeholder="Describe the core problem..." textarea /></div></div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</Button>
            <Button onClick={submit} disabled={submitting}><Send size={15} /> {submitting ? 'Submitting...' : 'Submit Deal Registration'}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
