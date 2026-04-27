import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--navy)'
    }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{
          width: 48, height: 48, background: 'var(--gold)', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: 'var(--navy)',
          margin: '0 auto 16px'
        }}>BI</div>
        <div style={{ fontSize: 13, opacity: 0.5 }}>Загрузка...</div>
      </div>
    </div>
  )

  return session ? <Dashboard session={session} /> : <Login />
}
