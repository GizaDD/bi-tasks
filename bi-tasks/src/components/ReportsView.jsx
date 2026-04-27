import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ReportsView({ profile }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: projects }, { data: tasks }, { data: profiles }, { data: steps }] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('tasks').select('*, profiles(full_name)'),
        supabase.from('profiles').select('*').eq('role', 'manager'),
        supabase.from('steps').select('*'),
      ])
      setData({ projects: projects || [], tasks: tasks || [], profiles: profiles || [], steps: steps || [] })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ color: 'var(--text3)', textAlign: 'center', paddingTop: 40 }}>Загрузка...</div>

  const { projects, tasks, profiles, steps } = data
  const today = new Date().toISOString().slice(0, 10)

  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const overdue = tasks.filter(t => t.deadline && t.deadline < today && t.status !== 'done').length
  const totalSteps = steps.length
  const doneSteps = steps.filter(s => s.done).length
  const overallPct = totalSteps ? Math.round(doneSteps / totalSteps * 100) : 0

  // Per-manager stats
  const managerStats = profiles.map(m => {
    const mt = tasks.filter(t => t.assignee_id === m.id)
    const ms = steps.filter(s => mt.some(t => t.id === s.task_id))
    const mDone = ms.filter(s => s.done).length
    const mOverdue = mt.filter(t => t.deadline && t.deadline < today && t.status !== 'done').length
    const pct = ms.length ? Math.round(mDone / ms.length * 100) : 0
    return { ...m, taskCount: mt.length, stepTotal: ms.length, stepDone: mDone, overdue: mOverdue, pct }
  }).sort((a, b) => b.pct - a.pct)

  // Priority breakdown
  const byPriority = ['critical', 'high', 'medium', 'low'].map(pr => ({
    pr, count: tasks.filter(t => t.priority === pr && t.status !== 'done').length,
    label: { critical: 'Критические', high: 'Высокий', medium: 'Средний', low: 'Низкий' }[pr],
    color: { critical: 'var(--red)', high: 'var(--amber)', medium: 'var(--blue)', low: 'var(--text3)' }[pr],
    bg: { critical: 'var(--red-bg)', high: 'var(--amber-bg)', medium: 'var(--blue-bg)', low: '#f1f5f9' }[pr],
  }))

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Отчёты и аналитика</h1>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>Общая картина по всем проектам</p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 24 }} className="mobile-grid-1">
        {[
          { label: 'Всего проектов', value: projects.length, color: 'var(--navy)' },
          { label: 'Задач открыто', value: totalTasks - doneTasks, color: 'var(--blue)' },
          { label: 'Просрочено', value: overdue, color: overdue > 0 ? 'var(--red)' : 'var(--green)' },
          { label: 'Общий прогресс', value: overallPct + '%', color: 'var(--green)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 500 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 300, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }} className="mobile-grid-1">

        {/* Manager table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Загрузка менеджеров</div>
          </div>
          {managerStats.map((m, i) => {
            const initials = m.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
            return (
              <div key={m.id} style={{ padding: '14px 20px', borderBottom: i < managerStats.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue-bg)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.taskCount} задач · {m.stepDone}/{m.stepTotal} шагов {m.overdue > 0 && <span style={{ color: 'var(--red)' }}>· {m.overdue} просроч.</span>}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: m.pct >= 70 ? 'var(--green)' : m.pct >= 30 ? 'var(--amber)' : 'var(--text2)' }}>{m.pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: m.pct + '%', background: m.pct >= 70 ? 'var(--green)' : m.pct >= 30 ? 'var(--amber)' : 'var(--navy)', transition: 'width 0.4s' }} />
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Priority breakdown */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Открытые задачи по приоритету</div>
            {byPriority.map(p => (
              <div key={p.pr} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500, background: p.bg, color: p.color, minWidth: 90, textAlign: 'center' }}>{p.label}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: p.color, width: totalTasks ? (p.count / totalTasks * 100) + '%' : '0%', transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', minWidth: 20, textAlign: 'right' }}>{p.count}</span>
              </div>
            ))}
          </div>

          {/* Projects status */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Статус проектов</div>
            {projects.map((p, i) => {
              const pt = tasks.filter(t => t.project_id === p.id)
              const ps = steps.filter(s => pt.some(t => t.id === s.task_id))
              const pct = ps.length ? Math.round(ps.filter(s => s.done).length / ps.length * 100) : 0
              return (
                <div key={p.id} style={{ marginBottom: i < projects.length - 1 ? 12 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: pct + '%', background: pct === 100 ? 'var(--green)' : 'var(--navy)', transition: 'width 0.4s' }} />
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
