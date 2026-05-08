import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [company, setCompany] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async () => {
    setError(''); setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setSubmitting(false)
  }

  const handleRegister = async () => {
    if (!email || !password || !company || !contact) {
      setError('Please fill out all required fields.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setError(''); setSubmitting(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company, contact_name: contact, phone },
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) {
      setError(error.message)
    } else if (data?.user?.identities?.length === 0) {
      setError('An account with this email already exists.')
    } else {
      setMessage('Check your email for a confirmation link. Once confirmed, sign in here.')
      setMode('login')
    }
    setSubmitting(false)
  }

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email address first.'); return }
    setError(''); setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) setError(error.message)
    else setMessage('Password reset link sent. Check your email.')
    setSubmitting(false)
  }

  const darkInput = 'w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40 transition-all'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1a0e2e 0%, #261545 35%, #1e1040 70%, #0f0a1e 100%)' }}>
      {/* Aurora background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora-orb" style={{ width: 500, height: 500, top: '10%', left: '15%', background: 'radial-gradient(circle, #6639a6, #4a1f8a 40%, transparent 70%)', animation: 'aurora1 14s ease-in-out infinite' }} />
        <div className="aurora-orb" style={{ width: 400, height: 400, bottom: '15%', right: '10%', background: 'radial-gradient(circle, #9b6dff, #7c4dca 40%, transparent 70%)', animation: 'aurora2 18s ease-in-out infinite' }} />
        <div className="aurora-orb" style={{ width: 350, height: 350, top: '50%', left: '50%', marginLeft: -175, marginTop: -175, background: 'radial-gradient(circle, #8855dd, transparent 65%)', animation: 'aurora3 22s ease-in-out infinite' }} />
        <div className="aurora-orb" style={{ width: 300, height: 300, top: '5%', right: '25%', background: 'radial-gradient(circle, #5a2d8a, transparent 65%)', animation: 'aurora4 16s ease-in-out infinite' }} />
        <div className="aurora-orb" style={{ width: 450, height: 450, bottom: '5%', left: '30%', background: 'radial-gradient(circle, #7040b0, transparent 70%)', animation: 'aurora5 20s ease-in-out infinite' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo-white.svg" alt="Atlas" className="h-10 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-1">Channel Partner Portal</h1>
          <p className="text-slate-400 text-sm">Register deals and track their progress</p>
        </div>

        <div className="rounded-2xl border border-white/10 p-6 shadow-2xl" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
          <div className="flex mb-6 bg-white/5 rounded-lg p-0.5">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setMessage('') }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${mode === m ? 'bg-violet-600/30 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />{error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              {message}
            </div>
          )}

          <div className="space-y-3.5">
            {mode === 'register' && (
              <>
                <label className="block">
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">Company Name *</span>
                  <input type="text" className={darkInput} value={company} onChange={e => setCompany(e.target.value)} placeholder="Your advisory firm" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">Your Name *</span>
                  <input type="text" className={darkInput} value={contact} onChange={e => setContact(e.target.value)} placeholder="Full name" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-slate-300 mb-1.5">Phone</span>
                  <input type="tel" className={darkInput} value={phone} onChange={e => setPhone(e.target.value)} placeholder="555-555-0000" />
                </label>
              </>
            )}
            <label className="block">
              <span className="block text-xs font-medium text-slate-300 mb-1.5">Email *</span>
              <input type="email" className={darkInput} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-300 mb-1.5">Password *</span>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className={darkInput + ' pr-10'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" type="button">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </div>

          <button
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={submitting}
            className="w-full mt-5 inline-flex items-center justify-center gap-2 font-semibold rounded-lg text-white px-6 py-3 text-base transition-all duration-200 shadow-sm shadow-violet-300/30 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6639a6 0%, #7c4dca 100%)' }}
          >
            {submitting ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Partner Account')} <ArrowRight size={16} />
          </button>

          {mode === 'login' && (
            <button onClick={handleForgotPassword} className="w-full mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Forgot your password?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
