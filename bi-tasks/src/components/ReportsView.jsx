import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ProfileView({ profile, session, onSaved }) {
  const [form, setForm] = useState({
    full_name: profile.full_name || '',
    dept: profile.dept || '',
  })
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const initials = form.full_name
    ? form.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : session.user.email[0].toUpperCase()

  const RL = { chief: 'Руководитель', manager: 'Менеджер', specialist: 'Специалист' }

  async function save() {
    setErr(''); setMsg('')
    if (pw && pw !== pw2) { setErr('Пароли не совпадают'); return }
    if (pw && pw.length < 6) { setErr('Пароль минимум 6 символов'); return }
    setSaving(true)

    // Update profile name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name })
      .eq('id', profile.id)

    if (profileError) { setErr('Ошибка сохранения профиля'); setSaving(false); return }

    // Update password if provided
    if (pw) {
      const { error: pwError } = await supabase.auth.updateUser({ password: pw })
      if (pwError) { setErr('Ошибка смены пароля: ' + pwError.message); setSaving(false); return }
    }

    setMsg('✓ Данные успешно сохранены')
    setPw(''); setPw2('')
    setSaving(false)
    if (onSaved) onSaved(form.full_name)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 400, color: '#0A2540', marginBottom: 4 }}>Мой профиль</h1>
        <p style={{ fontSize: 14, color: '#8fa3bb' }}>Личные данные и настройки безопасности</p>
      </div>

      <div style={{ maxWidth: 500 }}>
        {/* Avatar block */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(10,37,64,0.1)', borderRadius: 10, padding: '24px', marginBottom: 16, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#1a6b8a',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, margin: '0 auto 12px',
          }}>{initials}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0A2540' }}>{form.full_name || 'Пользователь'}</div>
          <div style={{ fontSize: 12, color: '#8fa3bb', marginTop: 4 }}>
            {RL[profile.role] || 'Сотрудник'} · {session.user.email}
          </div>
        </div>

        {/* Form */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(10,37,64,0.1)', borderRadius: 10, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', marginBottom: 14, paddingBottom: 10, borderBottom: '0.5px solid rgba(10,37,64,0.07)' }}>
              Личные данные
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Имя</label>
              <input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Ваше имя"
                style={inp}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Email</label>
              <input
                value={session.user.email}
                disabled
                style={{ ...inp, background: '#f1f5f9', color: '#8fa3bb', cursor: 'not-allowed' }}
              />
              <div style={{ fontSize: 11, color: '#8fa3bb', marginTop: 4 }}>Email изменить нельзя</div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A2540', marginBottom: 14, paddingBottom: 10, borderBottom: '0.5px solid rgba(10,37,64,0.07)' }}>
              Смена пароля
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Новый пароль</label>
              <input
                type="password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="Минимум 6 символов"
                style={inp}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Повторите пароль</label>
              <input
                type="password"
                value={pw2}
                onChange={e => setPw2(e.target.value)}
                placeholder="Повторите новый пароль"
                style={inp}
              />
            </div>
          </div>

          {err && (
            <div style={{ background: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
              {err}
            </div>
          )}
          {msg && (
            <div style={{ background: '#e6f7f1', color: '#085041', fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
              {msg}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            style={{
              width: '100%', background: '#FFB81C', color: '#0A2540',
              border: 'none', borderRadius: 6, padding: '10px',
              fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  )
}

const lbl = { fontSize: 11, color: '#8fa3bb', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }
const inp = { width: '100%', padding: '8px 11px', border: '1.5px solid rgba(10,37,64,0.15)', borderRadius: 6, fontSize: 13, color: '#0A2540', background: '#f9fafb', fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box' }
