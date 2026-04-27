import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from './Sidebar'
import ProjectsView from './ProjectsView'
import ProjectDetail from './ProjectDetail'
import AdminView from './AdminView'
import CalendarView from './CalendarView'
import ReportsView from './ReportsView'

export default function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('projects')
  const [selectedProject, setSelectedProject] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(data)
    }
    loadProfile()
  }, [session])

  if (!profile) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ width: 48, height: 48, background: 'var(--gold)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--navy)', margin: '0 auto 16px' }}>BI</div>
        <div style={{ fontSize: 13, opacity: 0.5 }}>Загрузка...</div>
      </div>
    </div>
  )

  function openProject(project) { setSelectedProject(project); setView('project'); setSidebarOpen(false) }
  function navigate(v) { setView(v); setSelectedProject(null); setSidebarOpen(false) }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
      )}
      <Sidebar profile={profile} view={view} setView={navigate} session={session} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div id="mobile-bar" style={{ background: 'var(--navy)', padding: '12px 16px', alignItems: 'center', gap: 12, display: 'none' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, padding: 4, cursor: 'pointer' }}>☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: 'var(--gold)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>BI</div>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>Tasks</span>
          </div>
        </div>
        <main id="main-pad" style={{ flex: 1, overflow: 'auto', padding: '32px 36px' }}>
          {view === 'projects' && <ProjectsView profile={profile} onOpenProject={openProject} />}
          {view === 'project' && selectedProject && <ProjectDetail project={selectedProject} profile={profile} onBack={() => navigate('projects')} />}
          {view === 'calendar' && <CalendarView profile={profile} />}
          {view === 'reports' && profile.role === 'chief' && <ReportsView profile={profile} />}
          {view === 'admin' && profile.role === 'chief' && <AdminView profile={profile} />}
        </main>
      </div>
      <style>{`@media(max-width:768px){#mobile-bar{display:flex!important}#main-pad{padding:16px!important}}`}</style>
    </div>
  )
}
