import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const PRI = {
  low:      { label: 'Низкий',      bg: '#f1f5f9', color: '#64748b' },
  medium:   { label: 'Средний',     bg: 'var(--blue-bg)',  color: 'var(--blue)'  },
  high:     { label: 'Высокий',     bg: 'var(--amber-bg)', color: 'var(--amber)' },
  critical: { label: 'Критический', bg: 'var(--red-bg)',   color: 'var(--red)'   },
}

export default function ProjectDetail({ project, profile, onBack }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedTask, setExpandedTask] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', deadline: '' })
  const [draftSteps, setDraftSteps] = useState([])
  const [stepInput, setStepInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadTasks() }, [project.id])

  async function loadTasks() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*, steps(*), profiles(full_name), comments(*, profiles(full_name)), files(*)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  async function toggleStep(stepId, done) {
    await supabase.from('steps').update({ done: !done }).eq('id', stepId)
    setTasks(prev => prev.map(t => ({ ...t, steps: t.steps.map(s => s.id === stepId ? { ...s, done: !done } : s) })))
  }

  async function createTask() {
    if (!form.title.trim()) return
    setSaving(true)
    const { data: task } = await supabase.from('tasks').insert({
      project_id: project.id, title: form.title, description: form.description,
      priority: form.priority, deadline: form.deadline || null,
      assignee_id: project.manager_id, author_id: profile.id, status: 'active',
    }).select().single()
    if (task && draftSteps.length > 0) {
      await supabase.from('steps').insert(draftSteps.map((title, i) => ({ task_id: task.id, title, order: i, done: false })))
    }
    setForm({ title: '', description: '', priority: 'medium', deadline: '' })
    setDraftSteps([]); setShowForm(false); setSaving(false)
    loadTasks()
  }

  async function deleteTask(taskId) {
    if (!confirm('Удалить задачу?')) return
    await supabase.from('steps').delete().eq('task_id', taskId)
    await supabase.from('comments').delete().eq('task_id', taskId)
    await supabase.from('files').delete().eq('task_id', taskId)
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const canEdit = profile.role === 'chief'

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}>← Все проекты</button>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: 20, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 400, marginBottom: 4 }}>{project.name}</h1>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>{project.description}</p>
            {project.deadline && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Дедлайн: {fmtDate(project.deadline)}</p>}
          </div>
          {canEdit && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ flexShrink: 0 }}>
              {showForm ? 'Отмена' : '+ Новая задача'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--navy)', borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Новая задача</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={lbl}>Название</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Что нужно сделать?" /></div>
            <div><label style={lbl}>Описание</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Подробности..." /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={lbl}>Приоритет</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Низкий</option><option value="medium">Средний</option>
                  <option value="high">Высокий</option><option value="critical">Критический</option>
                </select>
              </div>
              <div><label style={lbl}>Дедлайн</label><input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
            </div>
            <div>
              <label style={lbl}>Шаги</label>
              {draftSteps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, flex: 1 }}>• {s}</span>
                  <button className="btn-danger" onClick={() => setDraftSteps(p => p.filter((_, j) => j !== i))} style={{ padding: '2px 7px', fontSize: 11 }}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={stepInput} onChange={e => setStepInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setDraftSteps(p => [...p, stepInput.trim()]); setStepInput('') } }} placeholder="Добавить шаг..." style={{ flex: 1 }} />
                <button className="btn-ghost" onClick={() => { if (stepInput.trim()) { setDraftSteps(p => [...p, stepInput.trim()]); setStepInput('') } }}>+</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowForm(false)}>Отмена</button>
              <button className="btn-primary" onClick={createTask} disabled={saving}>{saving ? 'Сохранение...' : 'Назначить задачу'}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text3)', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>Загрузка...</div>
      ) : tasks.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>Задач пока нет</div>
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
              onRefresh={loadTasks}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, profile, canEdit, expanded, onToggle, onToggleStep, onDelete, onRefresh }) {
  const p = PRI[task.priority] || PRI.medium
  const doneSteps = (task.steps || []).filter(s => s.done).length
  const totalSteps = (task.steps || []).length
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  async function postComment() {
    if (!comment.trim()) return
    setPosting(true)
    await supabase.from('comments').insert({ task_id: task.id, author_id: profile.id, body: comment.trim() })
    setComment(''); setPosting(false); onRefresh()
  }

  async function uploadFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const path = `${task.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('task-files').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('task-files').getPublicUrl(path)
      await supabase.from('files').insert({ task_id: task.id, name: file.name, url: publicUrl, uploaded_by: profile.id })
      onRefresh()
    }
    setUploading(false)
  }

  async function deleteFile(fileId) {
    await supabase.from('files').delete().eq('id', fileId)
    onRefresh()
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
      {/* Header — always visible */}
      <div style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{task.title}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500, background: p.bg, color: p.color, flexShrink: 0 }}>{p.label}</span>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text3)', flexWrap: 'wrap' }}>
              {task.profiles?.full_name && <span>{task.profiles.full_name}</span>}
              {task.deadline && <span>до {fmtDate(task.deadline)}</span>}
              {totalSteps > 0 && <span>{doneSteps}/{totalSteps} шагов</span>}
              {(task.comments || []).length > 0 && <span>💬 {task.comments.length}</span>}
              {(task.files || []).length > 0 && <span>📎 {task.files.length}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {canEdit && (
              <button className="btn-danger" onClick={e => { e.stopPropagation(); onDelete(task.id) }} style={{ fontSize: 11, padding: '4px 8px' }}>Удалить</button>
            )}
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
        {totalSteps > 0 && (
          <div style={{ height: 3, background: 'var(--bg)', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: doneSteps === totalSteps ? 'var(--green)' : 'var(--navy)', width: Math.round(doneSteps / totalSteps * 100) + '%', transition: 'width 0.3s' }} />
          </div>
        )}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
          {task.description && <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>{task.description}</p>}

          {/* Steps */}
          {task.steps?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Шаги</div>
              {task.steps.sort((a, b) => a.order - b.order).map(step => (
                <label key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', fontSize: 13, color: step.done ? 'var(--text3)' : 'var(--text)', textDecoration: step.done ? 'line-through' : 'none' }}>
                  <input type="checkbox" checked={step.done} onChange={() => onToggleStep(step.id, step.done)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--navy)', flexShrink: 0 }} />
                  {step.title}
                </label>
              ))}
            </div>
          )}

          {/* Files */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Файлы</div>
            {(task.files || []).map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 16 }}>📎</span>
                <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--blue)', flex: 1, textDecoration: 'none' }}>{f.name}</a>
                {canEdit && <button className="btn-danger" onClick={() => deleteFile(f.id)} style={{ fontSize: 11, padding: '2px 6px' }}>✕</button>}
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <input type="file" ref={fileRef} onChange={uploadFile} style={{ display: 'none' }} />
              <button className="btn-ghost" onClick={() => fileRef.current.click()} disabled={uploading} style={{ fontSize: 12, padding: '6px 12px' }}>
                {uploading ? 'Загрузка...' : '+ Прикрепить файл'}
              </button>
            </div>
          </div>

          {/* Comments */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Комментарии</div>
            {(task.comments || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(c => (
              <div key={c.id} style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{c.profiles?.full_name || 'Пользователь'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDateTime(c.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{c.body}</p>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && postComment()} placeholder="Написать комментарий..." style={{ flex: 1 }} />
              <button className="btn-primary" onClick={postComment} disabled={posting || !comment.trim()} style={{ flexShrink: 0 }}>
                {posting ? '...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lbl = { fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5, fontWeight: 500 }

function fmtDate(d) { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}.${m}.${y}` }
function fmtDateTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' }) + ' ' + dt.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}
