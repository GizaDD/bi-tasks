import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ReportsView({ profile }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: projects }, { data: tasks }, { data: profiles }, { data: steps }] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('profiles').select('*').neq('role', 'chief'),
        supabase.from('steps').select('*'),
      ])
      setData({ projects: projects || [], tasks: tasks || [], profiles: profiles || [], steps: steps || [] })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ color: '#8fa3bb', textAlign: 'center', paddingTop: 40 }}>Загрузка...</div>

  const { projects, tasks, profiles, steps } = data
  const today = new Date().toISOString().slice(0, 10)

  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const overdue = tasks.filter(t => t.deadline && t.deadline < today && t.status !== 'done').length
  const totalSteps = steps.length
  const doneSteps = steps.filter(s => s.done).length
  const overallPct = totalSteps ? Math.round(doneSteps / totalSteps * 100) : 0

  const managerStats = profiles.map(m => {
    const mt = tasks.filter(t => t.assignee_id === m.id)
    const ms = steps.filter(s => mt.some(t => t.id === s.task_id))
    const mDone = ms.filter(s => s.done).length
    const mOverdue = mt.filter(t => t.deadline && t.deadline < today && t.status !== 'done').length
    const pct = ms.length ? Math.round(mDone / ms.length * 100) : 0
    const initials = m.full_name ? m.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'
    return { ...m, initials, taskCount: mt.length, stepTotal: ms.length, stepDone: mDone, overdue: mOverdue, pct }
  }).sort((a, b) => b.pct - a.pct)

  const byPriority = ['critical', 'high', 'medium', 'low'].map(pr => ({
    pr,
    count: tasks.filter(t => t.priority === pr && t.status !== 'done').length,
    label: { critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий' }[pr],
    color: { critical: '#991b1b', high: '#92400e', medium: '#1e40af', low: '#475569' }[pr],
    bg: { critical: '#fee2e2', high: '#fef3c7', medium: '#dbeafe', low: '#f1f5f9' }[pr],
  }))

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 400, color: '#0A2540', marginBottom: 4 }}>Отчёты и аналитика</h1>
        <p style={{ fontSize: 14, color: '#8fa3bb' }}>Общая картина по всем проектам</p>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Всего проектов',  value: projects.length,          color: '#0A2540' },
          { label: 'Задач открыто',   value: totalTasks - doneTasks,   color: '#1a6b8a' },
          { label: 'Просрочено',      value: overdue,                  color: overdue > 0 ? '#dc2626' : '#1a9e6e' },
          { label: 'Общий прогресс',  value: overallPct + '%',         color: '#1a9e6e' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '0.5px solid rgba(10,37,64,0.1)', borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, color: '#8fa3bb', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 300, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* Сотрудники */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(10,37,64,0.1)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(10,37,64,0.07)', fontSize: 14, fontWeight: 700, color: '#0A2540' }}>
            Загрузка сотрудников
          </div>
          {managerStats.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#8fa3bb', fontSize: 13 }}>Нет данных</div>
          ) : managerStats.map(m => (
            <div key={m.id} style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(10,37,64,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a6b8a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {m.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0A2540' }}>{m.full_name}</div>
                  <div style={{ fontSize: 11, color: '#8fa3bb' }}>
                    {m.taskCount} задач · {m.stepDone}/{m.stepTotal} шагов
                    {m.overdue > 0 && <span style={{ color: '#dc2626' }}> · {m.overdue} просроч.</span>}
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: m.pct >= 70 ? '#1a9e6e' : m.pct >= 30 ? '#d97706' : '#4a6080' }}>
                  {m.pct}%
                </span>
              </div>
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, width: m.pct + '%', background: m.pct >= 70 ? '#1a9e6e' : m.pct >= 30 ? '#d97706' : '#1a6b8a', transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Приоритеты */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(10,37,64,0.1)', borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 14 }}>Задачи по приоритету</div>
            {byPriority.map(p => (
              <div key={p.pr} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600, background: p.bg, color: p.color, minWidth: 88, textAlign: 'center' }}>{p.label}</span>
                <div style={{ flex: 1, height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: p.color, width: totalTasks ? (p.count / totalTasks * 100) + '%' : '0%', transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#4a6080', minWidth: 20, textAlign: 'right' }}>{p.count}</span>
              </div>
            ))}
          </div>

          {/* Проекты */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(10,37,64,0.1)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(10,37,64,0.07)', fontSize: 14, fontWeight: 700, color: '#0A2540' }}>Прогресс проектов</div>
            {projects.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#8fa3bb', fontSize: 13 }}>Проектов нет</div>
            ) : projects.map((p, i) => {
              const pt = tasks.filter(t => t.project_id === p.id)
              const ps = steps.filter(s => pt.some(t => t.id === s.task_id))
              const pct = ps.length ? Math.round(ps.filter(s => s.done).length / ps.length * 100) : 0
              return (
                <div key={p.id} style={{ padding: '12px 18px', borderBottom: i < projects.length - 1 ? '0.5px solid rgba(10,37,64,0.05)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0A2540' }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: '#8fa3bb', fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: pct + '%', background: pct === 100 ? '#1a9e6e' : '#1a6b8a', transition: 'width 0.4s' }} />
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
