import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminView({ profile }) {
  const [projects, setProjects] = useState([])
  const [managers, setManagers] = useState([])
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', manager_id: '', deadline: '', status: 'active' })
  const [saving, setSaving] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('manager')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => {
    loadProjects()
    loadManagers()
  }, [])

  async function loadProjects() {
    const { data } = await supabase.from('projects').select('*, profiles(full_name)').order('created_at', { ascending: false })
    setProjects(data || [])
  }

  async function loadManagers() {
    const { data } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
    setManagers(data || [])
  }

  async function createProject() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('projects').insert({
      name: form.name,
      description: form.description,
      manager_id: form.manager_id || null,
      deadline: form.deadline || null,
      status: form.status,
    })
    setForm({ name: '', description: '', manager_id: '', deadline: '', status: 'active' })
    setShowProjectForm(false)
    setSaving(false)
    loadProjects()
  }

  async function deleteProject(id) {
    if (!confirm('Удалить проект и все задачи?')) return
    await supabase.from('projects').delete().eq('id', id)
    loadProjects()
  }

  async function inviteUser() {
    if (!inviteEmail.trim() || !inviteName.trim()) return
    setInviting(true)
    setInviteMsg('')

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail)

    if (error) {
      // If admin API not available, show manual instructions
      setInviteMsg(`Добавьте пользователя вручную в панели Supabase:\nEmail: ${inviteEmail}\nИмя: ${inviteName}\nРоль: ${inviteRole}`)
    } else {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: inviteName,
        role: inviteRole,
      })
      setInviteMsg(`Приглашение отправлено на ${inviteEmail}`)
      setInviteEmail('')
      setInviteName('')
      loadManagers()
    }
    setInviting(false)
  }

  const managersList = managers.filter(m => m.role === 'manager')

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Управление</h1>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>Проекты, команда и доступы</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* Projects */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={sectionTitle}>Проекты</h2>
            <button className="btn-primary" onClick={() => setShowProjectForm(!showProjectForm)} style={{ fontSize: 12, padding: '7px 12px' }}>
              {showProjectForm ? 'Отмена' : '+ Создать'}
            </button>
          </div>

          {showProjectForm && (
            <div style={formCard}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Название</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Напр. ЖК «Асыл Арман»" />
                </div>
                <div>
                  <label style={labelStyle}>Описание</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Краткое описание" />
                </div>
                <div>
                  <label style={labelStyle}>Сотрудник</label>
                  <select value={form.manager_id} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}>
                    <option value="">— Не назначен —</option>
                    {managersList.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Дедлайн</label>
                    <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Статус</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="active">Активен</option>
                      <option value="pause">Пауза</option>
                    </select>
                  </div>
                </div>
                <button className="btn-primary" onClick={createProject} disabled={saving}>
                  {saving ? 'Создание...' : 'Создать проект'}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map(p => (
              <div key={p.id} style={listItem}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {p.profiles?.full_name || 'Сотрудник не назначен'} · {p.status === 'active' ? 'Активен' : 'Пауза'}
                  </div>
                </div>
                <button className="btn-danger" onClick={() => deleteProject(p.id)} style={{ fontSize: 11, padding: '4px 8px' }}>
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div>
          <h2 style={{ ...sectionTitle, marginBottom: 14 }}>Команда</h2>

          {/* Invite */}
          <div style={formCard}>
            <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Добавить сотрудника</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Имя</label>
                <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Рамазан" />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="ramazan@bi.kz" />
              </div>
              <div>
                <label style={labelStyle}>Роль</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="manager">Сотрудник</option>
                  <option value="chief">Руководитель</option>
                </select>
              </div>
              <button className="btn-primary" onClick={inviteUser} disabled={inviting}>
                {inviting ? 'Отправка...' : 'Пригласить'}
              </button>
              {inviteMsg && (
                <div style={{ fontSize: 12, background: 'var(--green-bg)', color: 'var(--green)', padding: '8px 10px', borderRadius: 6, whiteSpace: 'pre-line' }}>
                  {inviteMsg}
                </div>
              )}
            </div>
          </div>

          {/* Members list */}
          <h3 style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Текущие сотрудники
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {managers.map(m => {
              const initials = m.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
              return (
                <div key={m.id} style={listItem}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: m.role === 'chief' ? 'var(--navy)' : 'var(--blue-bg)',
                    color: m.role === 'chief' ? '#fff' : 'var(--blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, flexShrink: 0,
                  }}>{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {m.role === 'chief' ? 'Руководитель' : 'Сотрудник'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

const sectionTitle = { fontSize: 14, fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const labelStyle = { fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5, fontWeight: 500 }
const formCard = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '18px 20px',
  marginBottom: 14, boxShadow: 'var(--shadow)',
}
const listItem = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '12px 14px',
  display: 'flex', alignItems: 'center', gap: 10,
  boxShadow: 'var(--shadow)',
}
