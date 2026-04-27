import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

export default function CalendarView({ profile }) {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [today] = useState(new Date())
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      let tq = supabase.from('tasks').select('*, projects(name), profiles(full_name)').not('deadline', 'is', null)
      let pq = supabase.from('projects').select('*').not('deadline', 'is', null)
      if (profile.role !== 'chief') { tq = tq.eq('assignee_id', profile.id); pq = pq.eq('manager_id', profile.id) }
      const [{ data: t }, { data: p }] = await Promise.all([tq, pq])
      setTasks(t || [])
      setProjects(p || [])
    }
    load()
  }, [profile])

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Mon-based offset
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d)

  function itemsOnDay(d) {
    if (!d) return []
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const t = tasks.filter(x => x.deadline === dateStr).map(x => ({ ...x, type: 'task', label: x.title, project: x.projects?.name }))
    const p = projects.filter(x => x.deadline === dateStr).map(x => ({ ...x, type: 'project', label: x.name }))
    return [...t, ...p]
  }

  const selectedItems = selected ? itemsOnDay(selected) : []

  // Upcoming deadlines list
  const upcoming = [...tasks, ...projects.map(p => ({ ...p, type: 'project', label: p.name, title: p.name }))]
    .filter(x => x.deadline >= today.toISOString().slice(0, 10))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 8)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Календарь дедлайнов</h1>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>Все задачи и проекты с датами</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }} className="mobile-grid-1">

        {/* Calendar */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <button className="btn-ghost" onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }} style={{ padding: '6px 12px' }}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{MONTHS[month]} {year}</span>
            <button className="btn-ghost" onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }} style={{ padding: '6px 12px' }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '8px 12px 0' }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 500, color: 'var(--text3)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '4px 12px 12px', gap: 2 }}>
            {cells.map((d, i) => {
              const items = itemsOnDay(d)
              const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const isSelected = d === selected
              const hasTasks = items.some(x => x.type === 'task')
              const hasProjects = items.some(x => x.type === 'project')
              return (
                <div
                  key={i}
                  onClick={() => d && setSelected(d === selected ? null : d)}
                  style={{
                    minHeight: 52, padding: '4px 5px', borderRadius: 6, cursor: d ? 'pointer' : 'default',
                    background: isSelected ? 'var(--navy)' : isToday ? 'var(--blue-bg)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  {d && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: isToday ? 600 : 400, color: isSelected ? '#fff' : isToday ? 'var(--blue)' : 'var(--text)', marginBottom: 3 }}>{d}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {hasTasks && <div style={{ height: 4, borderRadius: 99, background: isSelected ? 'var(--gold)' : 'var(--navy)', opacity: 0.7 }} />}
                        {hasProjects && <div style={{ height: 4, borderRadius: 99, background: isSelected ? '#fff' : 'var(--green)', opacity: 0.7 }} />}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, padding: '0 20px 14px', fontSize: 11, color: 'var(--text3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 4, borderRadius: 99, background: 'var(--navy)' }} /> Задачи</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 4, borderRadius: 99, background: 'var(--green)' }} /> Проекты</div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Selected day */}
          {selected && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
                {selected} {MONTHS[month]} — дедлайны
              </div>
              {selectedItems.length === 0
                ? <div style={{ fontSize: 13, color: 'var(--text3)' }}>Нет дедлайнов</div>
                : selectedItems.map((item, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: i < selectedItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title || item.label}</div>
                    <div style={{ fontSize: 11, color: item.type === 'project' ? 'var(--green)' : 'var(--blue)', marginTop: 2 }}>
                      {item.type === 'project' ? 'Проект' : `Задача · ${item.project || ''}`}
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* Upcoming */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Ближайшие дедлайны</div>
            {upcoming.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--text3)' }}>Дедлайны не назначены</div>
              : upcoming.map((item, i) => {
                const d = new Date(item.deadline)
                const diff = Math.ceil((d - today) / 86400000)
                const urgent = diff <= 3
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'start', gap: 10, padding: '8px 0', borderBottom: i < upcoming.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ textAlign: 'center', minWidth: 36, background: urgent ? 'var(--red-bg)' : 'var(--bg)', borderRadius: 6, padding: '3px 5px', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: urgent ? 'var(--red)' : 'var(--navy)' }}>{String(d.getDate()).padStart(2,'0')}</div>
                      <div style={{ fontSize: 9, color: urgent ? 'var(--red)' : 'var(--text3)', textTransform: 'uppercase' }}>{MONTHS[d.getMonth()].slice(0,3)}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {diff === 0 ? 'Сегодня!' : diff === 1 ? 'Завтра' : `Через ${diff} дн.`}
                      </div>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>

      </div>
    </div>
  )
}
