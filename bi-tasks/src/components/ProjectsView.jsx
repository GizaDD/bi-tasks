import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PRIORITY_MAP = {
  low:      { label: 'Низкий',      bg: '#f1f5f9', color: '#64748b' },
  medium:   { label: 'Средний',     bg: 'var(--blue-bg)',  color: 'var(--blue)'  },
  high:     { label: 'Высокий',     bg: 'var(--amber-bg)', color: 'var(--amber)' },
  critical: { label: 'Критический', bg: 'var(--red-bg)',   color: 'var(--red)'   },
}

export default function ProjectsView({ profile, onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [profile])

  async function loadData() {
    setLoading(true)
    let pq = supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (profile.role !== 'chief') pq = pq.eq('manager_id', profile.id)

    let tq = supabase.from('tasks').select('*, steps(*)')
    if (profile.role !== 'chief') tq = tq.eq('assignee_id', profile.id)

    const [{ data: p }, { data: t }] = await Promise.all([pq, tq])
    setProjects(p || [])
    setTasks(t || [])
    setLoading(false)
  }

  function getProjectStats(projectId) {
    const pt = tasks.filter(t => t.project_id === projectId)
    const allSteps = pt.flatMap(t => t.steps || [])
    const doneSteps = allSteps.filter(s => s.done)
    return {
      taskCount: pt.length,
      totalSteps: allSteps.length,
      doneSteps: doneSteps.length,
      pct: allSteps.length ? Math.round(doneSteps.length / allSteps.length * 100) : 0,
      openTasks: pt.filter(t => t.status !== 'done').length,
    }
  }

  // My open tasks section (for managers)
  const myOpenTasks = profile.role !== 'chief'
    ? tasks.filter(t => t.status !== 'done').slice(0, 5)
    : []

  if (loading) return (
    <div style={{ color: 'var(--text3)', fontSize: 14, paddingTop: 40, textAlign: 'center' }}>
      Загрузка...
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 4 }}>
          {profile.role === 'chief' ? 'Все проекты' : 'Мои проекты'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>
          {profile.role === 'chief'
            ? `${projects.length} проектов · управление командой`
            : `Добрый день, ${profile.full_name?.split(' ')[0] || ''}!`}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
        {[
          { label: 'Проектов', value: projects.length },
          { label: 'Открытых задач', value: tasks.filter(t => t.status !== 'done').length },
          { label: 'Шагов выполнено', value: tasks.flatMap(t => t.steps || []).filter(s => s.done).length },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 300, color: 'var(--navy)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* My tasks (manager only) */}
      {myOpenTasks.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ближайшие задачи
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myOpenTasks.map(task => {
              const p = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium
              const done = (task.steps || []).filter(s => s.done).length
              const total = (task.steps || []).length
              return (
                <div key={task.id} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: 'var(--shadow)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{task.title}</div>
                    {task.deadline && (
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>до {fmtDate(task.deadline)}</div>
                    )}
                  </div>
                  {total > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{done}/{total} шагов</div>
                  )}
                  <span style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 500,
                    background: p.bg, color: p.color,
                  }}>{p.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Projects grid */}
      <h2 style={{ fontSize: 14, fontWeight: 500, color: 'var(--text2)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {profile.role === 'chief' ? 'Все проекты' : 'Мои проекты'}
      </h2>

      {projects.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: 40, textAlign: 'center',
          color: 'var(--text3)', fontSize: 14,
        }}>
          {profile.role === 'chief' ? 'Проектов пока нет. Создайте первый в разделе «Управление».' : 'Проекты пока не назначены.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {projects.map(project => {
            const stats = getProjectStats(project.id)
            return (
              <div
                key={project.id}
                onClick={() => onOpenProject(project)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '20px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow)',
                  transition: 'box-shadow 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                  <div style={{ flex: 1, marginRight: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{project.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>{project.description}</div>
                  </div>
                  <span style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 500, flexShrink: 0,
                    background: project.status === 'active' ? 'var(--green-bg)' : 'var(--amber-bg)',
                    color: project.status === 'active' ? 'var(--green)' : 'var(--amber)',
                  }}>
                    {project.status === 'active' ? 'Активен' : 'Пауза'}
                  </span>
                </div>

                {project.deadline && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
                    Дедлайн: {fmtDate(project.deadline)}
                  </div>
                )}

                <div style={{ marginBottom: 8 }}>
                  <div style={{ height: 4, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      background: stats.pct === 100 ? 'var(--green)' : 'var(--navy)',
                      width: stats.pct + '%', transition: 'width 0.3s',
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
                  <span>{stats.taskCount} задач · {stats.doneSteps}/{stats.totalSteps} шагов</span>
                  <span style={{ fontWeight: 500, color: 'var(--text2)' }}>{stats.pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function fmtDate(d) {
  if (!d) return ''
  const [y, m, dd] = d.split('-')
  return `${dd}.${m}.${y}`
}
