import { FileText, BarChart3, Bell, Plus, LogOut, Menu, X } from 'lucide-react'

export default function Sidebar({ profile, view, onNavigate, onLogout, mobileMenuOpen, onToggleMobile }) {
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const navItems = isAdmin
    ? [{ id: 'admin-dashboard', label: 'Pipeline', icon: BarChart3 }, { id: 'notifications', label: 'Notifications', icon: Bell }, { id: 'register-deal', label: 'Register Deal', icon: Plus }]
    : [{ id: 'partner-dashboard', label: 'My Deals', icon: FileText }, { id: 'register-deal', label: 'Register Deal', icon: Plus }]

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white min-h-screen shrink-0">
        <div className="p-5 border-b border-slate-100">
          <img src="/logo-color.svg" alt="Atlas" className="h-7" />
          <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mt-1.5">Deal Portal</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => {
            const active = view === item.id
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={active ? { background: 'rgba(102,57,166,0.08)', color: '#6639a6' } : { color: '#64748b' }}>
                <item.icon size={17} /> {item.label}
              </button>
            )
          })}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="px-3 py-2 rounded-lg bg-slate-50 mb-2">
            <p className="text-xs font-semibold text-slate-700 truncate">{profile?.contact_name || profile?.email}</p>
            <p className="text-[10px] text-slate-400 truncate">{profile?.company}</p>
            {isAdmin && <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded" style={{ background: 'rgba(102,57,166,0.1)', color: '#6639a6' }}>Admin</span>}
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <img src="/logo-color.svg" alt="Atlas" className="h-6" />
        <button onClick={onToggleMobile} className="p-2 rounded-lg hover:bg-slate-100"><Menu size={20} className="text-slate-600" /></button>
      </div>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={onToggleMobile}>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <img src="/logo-color.svg" alt="Atlas" className="h-6" />
              <button onClick={onToggleMobile} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
            </div>
            <nav className="space-y-1 mb-6">
              {navItems.map(item => (
                <button key={item.id} onClick={() => onNavigate(item.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium"
                  style={view === item.id ? { background: 'rgba(102,57,166,0.08)', color: '#6639a6' } : { color: '#64748b' }}>
                  <item.icon size={17} /> {item.label}
                </button>
              ))}
            </nav>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-700">{profile?.contact_name || profile?.email}</p>
              <p className="text-[10px] text-slate-400 mb-3">{profile?.company}</p>
              <button onClick={onLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-500"><LogOut size={15} /> Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
