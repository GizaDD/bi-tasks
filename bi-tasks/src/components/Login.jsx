import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Неверный email или пароль')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--navy)',
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        maxWidth: 500,
      }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{
            width: 52, height: 52,
            background: 'var(--gold)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: 'var(--navy)',
            marginBottom: 32,
          }}>BI</div>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 300, lineHeight: 1.2, marginBottom: 12 }}>
            Операционные<br />задачи
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15 }}>
            Корпоративная система управления<br />проектами и задачами
          </p>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 32 }}>
          {['Только для сотрудников компании', 'Каждый видит только свои задачи', 'Защищённый доступ по паролю'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--gold)', flexShrink: 0
              }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        background: 'rgba(255,255,255,0.03)',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '40px 36px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 6 }}>Вход в систему</h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 28 }}>
            Введите email и пароль
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5, fontWeight: 500 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@bi.kz"
                required
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5, fontWeight: 500 }}>
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--red-bg)', color: 'var(--red)',
                fontSize: 13, padding: '10px 12px', borderRadius: 6,
              }}>{error}</div>
            )}

            <button
              type="submit"
              className="btn-gold"
              disabled={loading}
              style={{ marginTop: 6, padding: '12px', fontSize: 14, fontWeight: 600 }}
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 20, textAlign: 'center' }}>
            Нет доступа? Обратитесь к руководителю
          </p>
        </div>
      </div>
    </div>
  )
}
