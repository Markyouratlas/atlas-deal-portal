import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthScreen from './components/AuthScreen'
import Sidebar from './components/Sidebar'
import PartnerDashboard from './components/PartnerDashboard'
import AdminDashboard from './components/AdminDashboard'
import DealForm from './components/DealForm'
import NotificationSettings from './components/NotificationSettings'
import AdminSettings from './components/AdminSettings'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setProfile(data)
      const admin = data.role === 'admin' || data.role === 'super_admin'
      setView(admin ? 'admin-dashboard' : 'partner-dashboard')
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setView('dashboard')
    setMobileMenuOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #1a0e2e 0%, #261545 35%, #1e1040 70%, #0f0a1e 100%)' }}>
        <div className="animate-pulse flex flex-col items-center gap-3">
          <img src="/logo-white.svg" alt="Atlas" className="h-10 opacity-60" />
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!session || !profile) {
    return <AuthScreen />
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
  const navigate = (v) => { setView(v); setMobileMenuOpen(false) }

  const renderView = () => {
    if (view === 'register-deal') {
      return (
        <div className="p-4 sm:p-8">
          <DealForm
            profile={profile}
            onCancel={() => navigate(isAdmin ? 'admin-dashboard' : 'partner-dashboard')}
            onSuccess={() => navigate(isAdmin ? 'admin-dashboard' : 'partner-dashboard')}
          />
        </div>
      )
    }
    if (view === 'notifications' && isAdmin) {
      return <NotificationSettings />
    }
    if (view === 'settings' && isAdmin) {
      return <AdminSettings profile={profile} />
    }
    if (isAdmin) {
      return <AdminDashboard profile={profile} session={session} onNavigate={navigate} />
    }
    return <PartnerDashboard profile={profile} onNavigate={navigate} />
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar
        profile={profile}
        view={view}
        onNavigate={navigate}
        onLogout={handleLogout}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobile={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      <div className="flex-1 md:pt-0 pt-14 min-h-screen overflow-y-auto">
        {renderView()}
      </div>
    </div>
  )
}
