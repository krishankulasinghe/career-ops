import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
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

const FIELD_PLACEHOLDERS: Record<string, string> = {
  situation: 'What was the context and challenge?',
  task: 'What was your specific responsibility?',
  action: 'What steps did you take?',
  result: 'What was the outcome? Use numbers when possible.',
  reflection: 'What did you learn?',
};

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
      {/* Interview Schedule Calendar */}
      <div className="card mb-3">
        <div className="card-header">
          <h5 className="mb-0">Interview Schedule</h5>
        </div>
        <div className="card-body">
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth' }}
            events={[]}
            height={300}
          />
        </div>
      </div>

      {/* STAR Story Bank */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="mb-0">STAR Story Bank</h5>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setEditing(null); setForm(EMPTY_STORY); setShowCreate(true); }}
          >
            + Add Story
          </button>
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="card-body border-bottom py-2 d-flex gap-2 flex-wrap">
            <button
              className={`btn btn-sm${!filterTag ? ' btn-primary' : ' btn-falcon-default'}`}
              onClick={() => setFilterTag('')}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                className={`btn btn-sm${filterTag === t ? ' btn-primary' : ' btn-falcon-default'}`}
                onClick={() => setFilterTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="card-body">
          {isLoading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted py-4">
              No STAR stories yet. Add your first story to build your interview library.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filtered.map((s) => (
                <div key={s.id} className="card mb-0 border">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-flex-start gap-3">
                      <div className="flex-1" style={{ minWidth: 0 }}>
                        {s.tags.length > 0 && (
                          <div className="d-flex gap-1 flex-wrap mb-2">
                            {s.tags.map((t) => (
                              <span key={t} className="badge badge-soft-primary fs--2">{t}</span>
                            ))}
                          </div>
                        )}
                        <dl className="row fs--1 mb-0">
                          <dt className="col-sm-2 text-600">Situation</dt>
                          <dd className="col-sm-10">{s.situation.slice(0, 100)}{s.situation.length > 100 ? '…' : ''}</dd>
                          <dt className="col-sm-2 text-600">Task</dt>
                          <dd className="col-sm-10">{s.task.slice(0, 100)}{s.task.length > 100 ? '…' : ''}</dd>
                          <dt className="col-sm-2 text-600">Action</dt>
                          <dd className="col-sm-10">{s.action.slice(0, 100)}{s.action.length > 100 ? '…' : ''}</dd>
                          <dt className="col-sm-2 text-600">Result</dt>
                          <dd className="col-sm-10 mb-0">{s.result.slice(0, 100)}{s.result.length > 100 ? '…' : ''}</dd>
                        </dl>
                      </div>
                      <div className="d-flex flex-column gap-2" style={{ flexShrink: 0 }}>
                        <button className="btn btn-sm btn-falcon-default" onClick={() => setPracticeStory(s)}>Practice</button>
                        <button className="btn btn-sm btn-falcon-default" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteStory.mutate(s.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {stories.length > 0 && (
          <div className="card-footer fs--1 text-500 py-2">
            {filtered.length} of {stories.length} stor{stories.length !== 1 ? 'ies' : 'y'}
          </div>
        )}
      </div>

      {/* Practice modal */}
      {practiceStory && (
        <div className="modal fade show d-block" tabIndex={-1} onClick={() => setPracticeStory(null)} style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Q&A Practice Mode</h5>
                <button type="button" className="btn-close" onClick={() => setPracticeStory(null)} />
              </div>
              <div className="modal-body">
                <p className="text-primary fw-semi-bold mb-3">"Tell me about a time when you…"</p>
                {(['Situation', 'Task', 'Action', 'Result', 'Reflection'] as const).map((label) => {
                  const key = label.toLowerCase() as keyof Story;
                  const value = practiceStory[key] as string | undefined;
                  return value ? (
                    <div key={label} className="mb-3">
                      <div className="text-uppercase fs--2 fw-bold text-500 mb-1">{label}</div>
                      <div className="fs--1 lh-lg">{value}</div>
                    </div>
                  ) : null;
                })}
                {practiceStory.tags.length > 0 && (
                  <div className="d-flex gap-1 flex-wrap mt-3">
                    {practiceStory.tags.map((t) => (
                      <span key={t} className="badge badge-soft-primary fs--2">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-falcon-default" onClick={() => setPracticeStory(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {showCreate && (
        <div className="modal fade show d-block" tabIndex={-1} onClick={() => setShowCreate(false)} style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Edit Story' : 'Add STAR Story'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreate(false)} />
              </div>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                {(['situation', 'task', 'action', 'result', 'reflection'] as const).map((field) => (
                  <div key={field} className="mb-3">
                    <label className="form-label fw-semi-bold" style={{ textTransform: 'capitalize' }}>
                      {field}{field !== 'reflection' ? ' *' : ''}
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form[field]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      placeholder={FIELD_PLACEHOLDERS[field]}
                    />
                  </div>
                ))}
                <div className="mb-3">
                  <label className="form-label fw-semi-bold">Tags (comma-separated)</label>
                  <input
                    className="form-control"
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="leadership, conflict, technical, delivery"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-falcon-default"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={!form.situation || !form.task || !form.action || !form.result || createStory.isPending || updateStory.isPending}
                >
                  {(createStory.isPending || updateStory.isPending) ? 'Saving…' : 'Save Story'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
