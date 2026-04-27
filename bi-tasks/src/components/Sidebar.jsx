import { supabase } from '../lib/supabase'

export default function Sidebar({ profile, view, setView, session, open, onClose }) {
  async function logout() { await supabase.auth.signOut() }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : session.user.email[0].toUpperCase()

  const navItems = [
    { id: 'projects', label: 'Проекты', icon: '▦' },
    { id: 'calendar', label: 'Календарь', icon: '◻' },
    ...(profile.role === 'chief' ? [
      { id: 'reports', label: 'Отчёты', icon: '◈' },
      { id: 'admin', label: 'Управление', icon: '⚙' },
    ] : []),
  ]

  const sideStyle = {
    width: 220, background: '#1a6b8a', display: 'flex',
    flexDirection: 'column', padding: '24px 0', flexShrink: 0,
    position: 'sticky', top: 0, height: '100vh',
    transition: 'transform 0.25s',
  }

  return (
    <>
      <aside style={sideStyle} id="sidebar">
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--gold)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--navy)', flexShrink: 0 }}>BI</div>
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>BI Tasks</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                {profile.role === 'chief' ? 'Руководитель' : 'Менеджер'}
              </div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '16px 10px', flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: view === item.id ? 'rgba(255,255,255,0.2)' : 'transparent',
              color: view === item.id ? '#FFB81C' : '#ffffff',
              marginBottom: 2, textAlign: 'left', transition: 'all 0.15s',
              borderLeft: view === item.id ? '2px solid var(--gold)' : '2px solid transparent',
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: view === item.id ? 500 : 400 }}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.full_name || 'Пользователь'}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user.email}</div>
            </div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'rgba(255,255,255,0.12)', color: '#ffffff', fontSize: 12 }}>Выйти</button>
        </div>
      </aside>

      <style>{`
        @media(max-width:768px){
          #sidebar{
            position:fixed;left:0;top:0;height:100vh;z-index:50;
            transform:${open ? 'translateX(0)' : 'translateX(-100%)'};
          }
        }
      `}</style>
    </>
  )
}
