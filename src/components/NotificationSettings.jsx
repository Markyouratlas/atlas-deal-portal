import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Input } from './UI'
import { Bell, MessageSquare, Mail, Globe, Plus, Trash2 } from 'lucide-react'

export default function NotificationSettings() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [addType, setAddType] = useState(null)
  const [newConfig, setNewConfig] = useState({})

  const loadNotifications = async () => {
    const { data } = await supabase.from('notification_channels').select('*').order('created_at')
    setNotifications(data || [])
    setLoading(false)
  }

  useEffect(() => { loadNotifications() }, [])

  const addNotification = async () => {
    if (addType === 'slack' && !newConfig.channel) return
    if (addType === 'email' && !newConfig.address) return
    if (addType === 'webhook' && !newConfig.url) return
    await supabase.from('notification_channels').insert({ type: addType, config: newConfig, enabled: true })
    setAddType(null); setNewConfig({})
    loadNotifications()
  }

  const toggleNotification = async (id, enabled) => {
    await supabase.from('notification_channels').update({ enabled: !enabled }).eq('id', id)
    loadNotifications()
  }

  const removeNotification = async (id) => {
    await supabase.from('notification_channels').delete().eq('id', id)
    loadNotifications()
  }

  const typeInfo = {
    slack: { label: 'Slack', icon: MessageSquare, color: '#6639a6', bg: 'rgba(102,57,166,0.08)' },
    email: { label: 'Email', icon: Mail, color: '#6639a6', bg: 'rgba(102,57,166,0.08)' },
    webhook: { label: 'Webhook', icon: Globe, color: '#6639a6', bg: 'rgba(102,57,166,0.08)' },
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Notification Settings</h1>
      <p className="text-sm text-slate-500 mb-8">Get notified when a new deal is registered.</p>

      {loading ? (
        <div className="p-12 text-center"><div className="w-8 h-8 border-2 border-slate-200 border-t-atlas-600 rounded-full animate-spin mx-auto" /></div>
      ) : (
        <>
          <div className="space-y-3 mb-8">
            {notifications.map(n => {
              const info = typeInfo[n.type] || typeInfo.webhook
              return (
                <div key={n.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: info.bg }}>
                    <info.icon size={18} style={{ color: info.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{info.label}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {n.type === 'slack' && n.config?.channel}
                      {n.type === 'email' && n.config?.address}
                      {n.type === 'webhook' && n.config?.url}
                    </p>
                  </div>
                  <button onClick={() => toggleNotification(n.id, n.enabled)}
                    className="w-11 h-6 rounded-full transition-all relative"
                    style={{ background: n.enabled ? '#6639a6' : '#cbd5e1' }}>
                    <div className="bg-white rounded-full absolute top-0.5 transition-all shadow-sm" style={{ width: 20, height: 20, left: n.enabled ? 22 : 2 }} />
                  </button>
                  <button onClick={() => removeNotification(n.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
            {notifications.length === 0 && !addType && (
              <div className="text-center py-10 px-4 bg-white rounded-xl border border-slate-200">
                <Bell size={28} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">No notification channels configured</p>
                <p className="text-xs text-slate-400 mt-1">Add one below to start receiving deal alerts.</p>
              </div>
            )}
          </div>

          {!addType ? (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Add a notification channel</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(typeInfo).map(([key, info]) => (
                  <button key={key} onClick={() => { setAddType(key); setNewConfig({}) }}
                    className="p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 transition-all text-left group">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5" style={{ background: info.bg }}>
                      <info.icon size={16} style={{ color: info.color }} />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 group-hover:text-violet-700">{info.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {key === 'slack' && 'Post to a Slack channel'}
                      {key === 'email' && 'Send email notifications'}
                      {key === 'webhook' && 'Hit a custom URL'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Add {typeInfo[addType]?.label} Notification</h3>
              <div className="space-y-3">
                {addType === 'slack' && <><Input label="Channel Name" value={newConfig.channel || ''} onChange={v => setNewConfig(c => ({ ...c, channel: v }))} placeholder="#deal-notifications" required /><Input label="Webhook URL" value={newConfig.webhookUrl || ''} onChange={v => setNewConfig(c => ({ ...c, webhookUrl: v }))} placeholder="https://hooks.slack.com/services/..." required /></>}
                {addType === 'email' && <Input label="Email Address" type="email" value={newConfig.address || ''} onChange={v => setNewConfig(c => ({ ...c, address: v }))} placeholder="team@youratlas.com" required />}
                {addType === 'webhook' && <><Input label="Webhook URL" value={newConfig.url || ''} onChange={v => setNewConfig(c => ({ ...c, url: v }))} placeholder="https://api.yourservice.com/webhooks/deals" required /><Input label="Secret (optional)" value={newConfig.secret || ''} onChange={v => setNewConfig(c => ({ ...c, secret: v }))} placeholder="For HMAC signature verification" /></>}
              </div>
              <div className="flex gap-2 mt-4"><Button onClick={addNotification}><Plus size={14} /> Add Channel</Button><Button variant="secondary" onClick={() => setAddType(null)}>Cancel</Button></div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
