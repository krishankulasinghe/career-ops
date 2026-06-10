import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface Story {
  id: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection?: string;
  tags: string[];
  createdAt: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message ?? 'Failed'); }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const EMPTY_STORY = { situation: '', task: '', action: '', result: '', reflection: '', tags: '' };

export function InterviewPrepPage() {
  const qc = useQueryClient();
  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: () => apiFetch<Story[]>('/api/v1/stories'),
  });

  const [filterTag, setFilterTag] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Story | null>(null);
  const [form, setForm] = useState(EMPTY_STORY);
  const [practiceStory, setPracticeStory] = useState<Story | null>(null);

  const createStory = useMutation({
    mutationFn: (body: object) => apiFetch('/api/v1/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Story added'); setShowCreate(false); },
  });

  const updateStory = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & object) => apiFetch(`/api/v1/stories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Story updated'); setEditing(null); },
  });

  const deleteStory = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/stories/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Story deleted'); },
  });

  const handleSave = () => {
    const body = {
      situation: form.situation,
      task: form.task,
      action: form.action,
      result: form.result,
      reflection: form.reflection || undefined,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    if (editing) updateStory.mutate({ id: editing.id, ...body });
    else createStory.mutate(body);
  };

  const openEdit = (s: Story) => {
    setEditing(s);
    setForm({ situation: s.situation, task: s.task, action: s.action, result: s.result, reflection: s.reflection ?? '', tags: s.tags.join(', ') });
    setShowCreate(true);
  };

  const allTags = [...new Set(stories.flatMap((s) => s.tags))];
  const filtered = filterTag ? stories.filter((s) => s.tags.includes(filterTag)) : stories;

  return (
    <Layout title="Interview Prep">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${!filterTag ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterTag('')}>All</button>
            {allTags.map((t) => (
              <button key={t} className={`btn btn-sm ${filterTag === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterTag(t)}>{t}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY_STORY); setShowCreate(true); }}>
            + Add Story
          </button>
        </div>

        {isLoading ? <LoadingSpinner /> : !filtered.length ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No STAR stories yet. Add your first story to build your interview library.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((s) => (
              <div key={s.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      {s.tags.map((t) => (
                        <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(93,156,236,0.15)', color: 'var(--primary)' }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px 12px', fontSize: 13 }}>
                      <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Situation</div>
                      <div>{s.situation.slice(0, 100)}{s.situation.length > 100 ? '…' : ''}</div>
                      <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Task</div>
                      <div>{s.task.slice(0, 100)}{s.task.length > 100 ? '…' : ''}</div>
                      <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Action</div>
                      <div>{s.action.slice(0, 100)}{s.action.length > 100 ? '…' : ''}</div>
                      <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Result</div>
                      <div>{s.result.slice(0, 100)}{s.result.length > 100 ? '…' : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => setPracticeStory(s)}>Practice</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn btn-sm btn-secondary" style={{ color: 'var(--danger)' }} onClick={() => deleteStory.mutate(s.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Practice mode */}
      {practiceStory && (
        <div className="modal-overlay" onClick={() => setPracticeStory(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">Q&A Practice Mode</h2>
              <button className="modal-close" onClick={() => setPracticeStory(null)}>×</button>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>
              "Tell me about a time when you…"
            </div>
            {['Situation', 'Task', 'Action', 'Result', 'Reflection'].map((label) => {
              const key = label.toLowerCase() as keyof Story;
              const value = practiceStory[key] as string;
              return value ? (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>{value}</div>
                </div>
              ) : null;
            })}
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {practiceStory.tags.map((t) => (
                <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(93,156,236,0.15)', color: 'var(--primary)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Story' : 'Add STAR Story'}</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            {(['situation', 'task', 'action', 'result', 'reflection'] as const).map((field) => (
              <div key={field} className="form-group">
                <label className="form-label" style={{ textTransform: 'capitalize' }}>
                  {field}{field !== 'reflection' ? ' *' : ''}
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  placeholder={`${field === 'situation' ? 'What was the context and challenge?' : field === 'task' ? 'What was your specific responsibility?' : field === 'action' ? 'What steps did you take?' : field === 'result' ? 'What was the outcome? Use numbers when possible.' : 'What did you learn?'}`}
                />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input className="form-control" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="leadership, conflict, technical, delivery" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.situation || !form.task || !form.action || !form.result || createStory.isPending || updateStory.isPending}>
                {(createStory.isPending || updateStory.isPending) ? 'Saving…' : 'Save Story'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
