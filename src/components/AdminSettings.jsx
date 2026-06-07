import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Input } from './UI'
import { Calendar, Check, ExternalLink, AlertCircle } from 'lucide-react'

export default function AdminSettings({ profile }) {
  const [url, setUrl] = useState(profile.calendar_url || '')
  const [savedUrl, setSavedUrl] = useState(profile.calendar_url || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true); setError(''); setSaved(false)
    const trimmed = url.trim()
    const { error } = await supabase.from('profiles').update({ calendar_url: trimmed }).eq('id', profile.id)
    setSaving(false)
    if (error) { setError(error.message); return }
    setSavedUrl(trimmed)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-8">Manage your portal preferences.</p>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(102,57,166,0.08)' }}>
            <Calendar size={18} style={{ color: '#6639a6' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Your Calendar Link</h2>
            <p className="text-xs text-slate-400 mt-0.5">Used in "Deal Qualified" emails so reps can book a demo with you. Paste your Cal.com, Calendly, or other booking URL.</p>
          </div>
        </div>

        <Input
          label="Booking URL"
          type="url"
          value={url}
          onChange={setUrl}
          placeholder="https://cal.com/your-handle/intro-call"
        />

        {error && <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex gap-2"><AlertCircle size={14} className="shrink-0 mt-0.5" />{error}</div>}

        <div className="flex items-center gap-2 mt-4">
          <Button onClick={save} disabled={saving || url.trim() === savedUrl}>
            <Check size={15} /> {saving ? 'Saving...' : 'Save'}
          </Button>
          {saved && <span className="text-xs font-medium text-emerald-600 flex items-center gap-1"><Check size={13} /> Saved</span>}
        </div>

        {savedUrl && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1.5">Current calendar link</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-700 break-all">{savedUrl}</span>
              <Button variant="outline" size="sm" onClick={() => window.open(savedUrl, '_blank', 'noopener,noreferrer')}>
                <ExternalLink size={13} /> Test Link
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
