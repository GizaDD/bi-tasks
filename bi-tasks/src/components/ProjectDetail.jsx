import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const PRI = {
  low:      { label: 'Низкий',      bg: '#f1f5f9', color: '#64748b' },
  medium:   { label: 'Средний',     bg: '#dbeafe',  color: '#1e40af' },
  high:     { label: 'Высокий',     bg: '#fef3c7',  color: '#92400e' },
  critical: { label: 'Критический', bg: '#fee2e2',  color: '#991b1b' },
}

export default function ProjectDetail({ project, profile, onBack }) {
  const [tasks, setTasks] = useState([])
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedTask, setExpandedTask] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', deadline: '', assignee_id: '' })
  const [draftSteps, setDraftSteps] = useState([])
  const [stepInput, setStepInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTasks()
    loadManagers()
  }, [project.id])

  async function loadTasks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        steps (*),
        assignee:profiles!tasks_assignee_id_fkey (id, full_name),
        comments (*, author:profiles!comments_author_id_fkey (full_name))
      `)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
    if (error) console.error('loadTasks error:', error)
    setTasks(data || [])
    setLoading(false)
  }

  async function loadManagers() {
    const { data } = await supabase.from('profiles').select('id, full_name').neq('role', 'chief')
    setManagers(data || [])
  }

  async function toggleStep(stepId, done) {
    await supabase.from('steps').update({ done: !done }).eq('id', stepId)
    setTasks(prev => prev.map(t => ({
      ...t,
      steps: (t.steps || []).map(s => s.id === stepId ? { ...s, done: !done } : s)
    })))
  }

  async function createTask() {
    if (!form.title.trim()) return
    setSaving(true)
    const assigneeId = form.assignee_id || project.manager_id
    const { data: task, error } = await supabase.from('tasks').insert({
      project_id: project.id,
      title: form.title,
      description: form.description,
      priority: form.priority,
      deadline: form.deadline || null,
      assignee_id: assigneeId,
      author_id: profile.id,
      status: 'active',
    }).select().single()
    if (error) { console.error('createTask error:', error); setSaving(false); return }
    if (task && draftSteps.length > 0) {
      await supabase.from('steps').insert(
        draftSteps.map((title, i) => ({ task_id: task.id, title, order: i, done: false }))
      )
    }
    setForm({ title: '', description: '', priority: 'medium', deadline: '', assignee_id: '' })
    setDraftSteps([])
    setShowForm(false)
    setSaving(false)
    loadTasks()
  }

  async function addComment(taskId, body) {
    if (!body.trim()) return
    await supabase.from('comments').insert({ task_id: taskId, author_id: profile.id, body })
    loadTasks()
  }

  async function deleteTask(taskId) {
    if (!confirm('Удалить задачу?')) return
    await supabase.from('steps').delete().eq('task_id', taskId)
    await supabase.from('comments').delete().eq('task_id', taskId)
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const canEdit = profile.role === 'chief'

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#8fa3bb', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 20, padding: 0, fontFamily: 'Montserrat, sans-serif' }}>
        ← Все проекты
      </button>

      {/* Project header */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(10,37,64,0.1)', borderRadius: 10, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#0A2540', marginBottom: 4 }}>{project.name}</h1>
            <p style={{ fontSize: 13, color: '#8fa3bb' }}>{project.description}</p>
            {project.deadline && <p style={{ fontSize: 12, color: '#8fa3bb', marginTop: 4 }}>Дедлайн: {fmtDate(project.deadline)}</p>}
          </div>
          {canEdit && (
            <button
              onClick={() => { setShowForm(!showForm); setDraftSteps([]) }}
              style={{ background: '#1a6b8a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'Montserrat, sans-serif' }}
            >
              {showForm ? 'Отмена' : '+ Новая задача'}
            </button>
          )}
        </div>
      </div>

      {/* New task form */}
      {showForm && canEdit && (
        <div style={{ background: '#fff', border: '1.5px solid #1a6b8a', borderRadius: 10, padding: '20px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 16 }}>Новая задача</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={lbl}>Название задачи</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Что нужно сделать?" style={inp} />
            </div>
            <div>
              <label style={lbl}>Описание</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Подробности..." style={{ ...inp, minHeight: 72, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Приоритет</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inp}>
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="critical">Критический</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Дедлайн</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>Исполнитель</label>
              <select value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))} style={inp}>
                <option value="">— Выберите исполнителя —</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Шаги выполнения</label>
              {draftSteps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, flex: 1, color: '#0A2540' }}>• {s}</span>
                  <button onClick={() => setDraftSteps(p => p.filter((_, j) => j !== i))} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={stepInput}
                  onChange={e => setStepInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { if (stepInput.trim()) { setDraftSteps(p => [...p, stepInput.trim()]); setStepInput('') } } }}
                  placeholder="Добавить шаг..."
                  style={{ ...inp, flex: 1 }}
                />
                <button onClick={() => { if (stepInput.trim()) { setDraftSteps(p => [...p, stepInput.trim()]); setStepInput('') } }} style={{ background: 'transparent', color: '#4a6080', border: '0.5px solid rgba(10,37,64,0.2)', borderRadius: 6, padding: '7px 12px', fontSize: 13, cursor: 'pointer' }}>+</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowForm(false); setDraftSteps([]) }} style={{ background: 'transparent', color: '#4a6080', border: '0.5px solid rgba(10,37,64,0.2)', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Отмена</button>
              <button onClick={createTask} disabled={saving} style={{ background: '#1a6b8a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                {saving ? 'Сохранение...' : 'Назначить задачу'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks */}
      {loading ? (
        <div style={{ color: '#8fa3bb', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>Загрузка задач...</div>
      ) : tasks.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid rgba(10,37,64,0.1)', borderRadius: 10, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A2540', marginBottom: 6 }}>Задач пока нет</div>
          <div style={{ fontSize: 12, color: '#8fa3bb' }}>{canEdit ? 'Нажмите «Новая задача» чтобы добавить' : 'Руководитель ещё не назначил задачи'}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              profile={profile}
              canEdit={canEdit}
              expanded={expandedTask === task.id}
              onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              onToggleStep={toggleStep}
              onDelete={deleteTask}
              onAddComment={addComment}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, profile, canEdit, expanded, onToggle, onToggleStep, onDelete, onAddComment }) {
  const p = PRI[task.priority] || PRI.medium
  const steps = task.steps || []
  const doneSteps = steps.filter(s => s.done).length
  const [comment, setComment] = useState('')
  const assigneeName = task.assignee?.full_name || '—'

  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(10,37,64,0.1)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0A2540' }}>{task.title}</span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: p.bg, color: p.color }}>{p.label}</span>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#8fa3bb', flexWrap: 'wrap' }}>
              <span>Исполнитель: <b style={{ color: '#4a6080' }}>{assigneeName}</b></span>
              {task.deadline && <span>До: {fmtDate(task.deadline)}</span>}
              {steps.length > 0 && <span>{doneSteps}/{steps.length} шагов</span>}
              {(task.comments || []).length > 0 && <span>💬 {task.comments.length}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {canEdit && (
              <button onClick={e => { e.stopPropagation(); onDelete(task.id) }} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>Удалить</button>
            )}
            <span style={{ color: '#8fa3bb', fontSize: 11 }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
        {steps.length > 0 && (
          <div style={{ height: 3, background: '#f1f5f9', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: doneSteps === steps.length ? '#1a9e6e' : '#1a6b8a', width: Math.round(doneSteps / steps.length * 100) + '%', transition: 'width 0.3s' }} />
          </div>
        )}
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '0.5px solid rgba(10,37,64,0.07)', padding: '14px 18px', background: '#fafbfc' }}>
          {task.description && <p style={{ fontSize: 13, color: '#4a6080', marginBottom: 14, lineHeight: 1.6 }}>{task.description}</p>}

          {/* Steps */}
          {steps.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#8fa3bb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Шаги выполнения</div>
              {steps.sort((a, b) => a.order - b.order).map(step => (
                <label key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', cursor: 'pointer', fontSize: 13, color: step.done ? '#8fa3bb' : '#0A2540', textDecoration: step.done ? 'line-through' : 'none' }}>
                  <input type="checkbox" checked={step.done} onChange={() => onToggleStep(step.id, step.done)} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#1a6b8a', flexShrink: 0 }} />
                  {step.title}
                </label>
              ))}
            </div>
          )}

          {/* Comments */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#8fa3bb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Комментарии</div>
            {(task.comments || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(c => (
              <div key={c.id} style={{ background: '#f4f6f9', borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#0A2540', marginBottom: 2 }}>{c.author?.full_name || 'Пользователь'}</div>
                <div style={{ fontSize: 12, color: '#4a6080', lineHeight: 1.5 }}>{c.body}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) { onAddComment(task.id, comment); setComment('') } }}
                placeholder="Написать комментарий..."
                style={{ flex: 1, padding: '7px 10px', border: '0.5px solid rgba(10,37,64,0.15)', borderRadius: 5, fontSize: 12, fontFamily: 'Montserrat, sans-serif', outline: 'none' }}
              />
              <button
                onClick={() => { if (comment.trim()) { onAddComment(task.id, comment); setComment('') } }}
                style={{ background: '#1a6b8a', color: '#fff', border: 'none', borderRadius: 5, padding: '0 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'Montserrat, sans-serif' }}
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl = { fontSize: 11, color: '#8fa3bb', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }
const inp = { width: '100%', padding: '8px 11px', border: '1.5px solid rgba(10,37,64,0.15)', borderRadius: 6, fontSize: 12, color: '#0A2540', background: '#f9fafb', fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box' }

function fmtDate(d) {
  if (!d) return ''
  const [y, m, dd] = d.split('-')
  return `${dd}.${m}.${y}`
}
