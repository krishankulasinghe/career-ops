import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  usePromptTemplates, useTemplateVersions, useSavePromptOverride,
  useRollbackPrompt, useTestPrompt, useEnableABTest, useDisableABTest, useABTestStats,
  PromptTemplate,
} from '@/api/prompts';
import toast from 'react-hot-toast';

function SimpleDiff({ a, b }: { a: string; b: string }) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const maxLen = Math.max(aLines.length, bLines.length);

  return (
    <div className="font-monospace fs--2 overflow-auto">
      {Array.from({ length: maxLen }, (_, i) => {
        const aLine = aLines[i] ?? '';
        const bLine = bLines[i] ?? '';
        const changed = aLine !== bLine;
        return (
          <div key={i} className="d-flex">
            <div
              className="w-50 px-2 py-0"
              style={{
                borderRight: '1px solid var(--falcon-border-color)',
                background: changed ? 'rgba(239,68,68,0.1)' : 'transparent',
                color: changed ? '#ef4444' : undefined,
                lineHeight: 1.6,
              }}
            >
              {aLine || ' '}
            </div>
            <div
              className="w-50 px-2 py-0"
              style={{
                background: changed ? 'rgba(34,197,94,0.1)' : 'transparent',
                color: changed ? '#22c55e' : undefined,
                lineHeight: 1.6,
              }}
            >
              {bLine || ' '}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PromptSettingsPage() {
  const { data, isLoading } = usePromptTemplates();
  const { data: abStats } = useABTestStats();
  const saveOverride = useSavePromptOverride();
  const rollback = useRollbackPrompt();
  const testPrompt = useTestPrompt();
  const enableAB = useEnableABTest();
  const disableAB = useDisableABTest();

  const [selected, setSelected] = useState<PromptTemplate | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMode, setEditMode] = useState<'view' | 'edit' | 'diff' | 'test'>('view');
  const [testCV, setTestCV] = useState('');
  const [testJD, setTestJD] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [diffBase, setDiffBase] = useState<PromptTemplate | null>(null);

  const { data: versions } = useTemplateVersions(selected?.name ?? '', selected?.language ?? 'en');

  const handleSelect = (t: PromptTemplate) => {
    setSelected(t);
    setEditContent(t.content);
    setEditMode('view');
    setDiffBase(null);
    setTestOutput('');
  };

  const handleSave = async () => {
    if (!selected) return;
    await saveOverride.mutateAsync({
      name: selected.name,
      language: selected.language,
      content: editContent,
    });
    toast.success('Override saved as new version');
    setEditMode('view');
  };

  const handleRollback = async (id: string) => {
    await rollback.mutateAsync(id);
    toast.success('Rolled back to selected version');
  };

  const handleTest = async () => {
    if (!editContent) return;
    const result = await testPrompt.mutateAsync({
      promptContent: editContent,
      cvContent: testCV || undefined,
      jdContent: testJD || undefined,
    });
    setTestOutput(result.output);
    toast.success(`Done — ${result.usage.tokensIn}in + ${result.usage.tokensOut}out, $${result.usage.costUsd.toFixed(5)}, ${result.latencyMs}ms`);
  };

  const allTemplates = [...(data?.systemTemplates ?? []), ...(data?.orgTemplates ?? [])];
  const uniqueNames = [...new Set(allTemplates.map((t) => t.name))];

  if (isLoading) return <Layout title="Prompt Templates"><LoadingSpinner /></Layout>;

  return (
    <Layout title="Prompt Templates">
      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">Prompt Templates</h5>
                  <p className="text-600 fs--1 mb-0">View and customize AI evaluation prompt templates</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left panel — template list */}
        <div className="col-lg-3">
          <div className="card sticky-top" style={{ top: 72 }}>
            <div className="card-header py-2">
              <h6 className="mb-0 fw-semi-bold">Templates</h6>
            </div>
            <div className="card-body p-0">
              <nav className="nav flex-column">
                {uniqueNames.map((name) => {
                  const active = allTemplates.find((t) => t.name === name && t.isActive);
                  const hasOverride = data?.orgTemplates?.some((t) => t.name === name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => active && handleSelect(active)}
                      className={`nav-link text-start border-bottom px-3 py-2 ${selected?.name === name ? 'active bg-soft-primary' : ''}`}
                    >
                      <div className={`fs--1 ${selected?.name === name ? 'fw-semi-bold' : ''}`}>{name}</div>
                      <div className="fs--2 text-600 mt-1">
                        {hasOverride ? '✎ Custom override' : '● System default'}
                        {active && ` · v${active.version}`}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Right panel — editor */}
        <div className="col-lg-9">
          {selected ? (
            <div className="d-flex flex-column gap-3">

              {/* A/B test banner */}
              {abStats?.active && abStats.challengerName === selected.name && (
                <div className="alert alert-warning d-flex align-items-center gap-3 mb-0" role="alert">
                  <span><strong>⚡ A/B test active</strong> — challenger version {abStats.challengerId} vs control</span>
                  <button className="btn btn-sm btn-falcon-default ms-auto" onClick={() => disableAB.mutate()}>
                    Stop A/B Test
                  </button>
                </div>
              )}

              {/* Mode tabs */}
              <div className="btn-group btn-group-sm" role="group">
                {(['view', 'edit', 'diff', 'test'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`btn ${editMode === m ? 'btn-primary' : 'btn-falcon-default'}`}
                    onClick={() => setEditMode(m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>

              {editMode === 'view' && (
                <div className="card mb-3">
                  <div className="card-body">
                    <pre className="fs--2 mb-0" style={{ whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto' }}>
                      {selected.content}
                    </pre>
                    <div className="mt-3 fs--2 text-600">
                      {selected.orgId ? 'Custom override' : 'System default'} · v{selected.version}
                    </div>
                  </div>
                </div>
              )}

              {editMode === 'edit' && (
                <div className="card mb-3">
                  <div className="card-body p-0">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="form-control border-0 rounded font-monospace fs--2"
                      rows={20}
                      style={{ resize: 'vertical', minHeight: 400 }}
                    />
                  </div>
                  <div className="card-footer d-flex justify-content-end gap-2">
                    <button className="btn btn-falcon-default btn-sm" onClick={() => setEditContent(selected.content)}>Reset</button>
                    <button className="btn btn-primary btn-sm" disabled={saveOverride.isPending} onClick={handleSave}>
                      {saveOverride.isPending ? 'Saving…' : 'Save as New Version'}
                    </button>
                  </div>
                </div>
              )}

              {editMode === 'diff' && (
                <div className="card mb-3">
                  <div className="card-header">
                    <div className="d-flex align-items-center gap-3">
                      <label className="form-label mb-0 fw-semi-bold">Compare with version:</label>
                      <select
                        className="form-select form-select-sm w-auto"
                        value={diffBase?.id ?? ''}
                        onChange={(e) => setDiffBase(versions?.find((v) => v.id === e.target.value) ?? null)}
                      >
                        <option value="">Select version…</option>
                        {(versions ?? []).map((v) => (
                          <option key={v.id} value={v.id}>
                            v{v.version} — {v.orgId ? 'custom' : 'system'} {v.isActive ? '(active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    {diffBase ? (
                      <>
                        <div className="d-flex fs--2 text-600 border-bottom">
                          <div className="w-50 px-3 py-1 border-end">v{diffBase.version} (base)</div>
                          <div className="w-50 px-3 py-1">v{selected.version} (current)</div>
                        </div>
                        <SimpleDiff a={diffBase.content} b={selected.content} />
                        <div className="card-footer d-flex gap-2">
                          <button className="btn btn-sm btn-falcon-default" onClick={() => handleRollback(diffBase.id)} disabled={rollback.isPending}>
                            Rollback to v{diffBase.version}
                          </button>
                          {!abStats?.active && (
                            <button className="btn btn-sm btn-falcon-default" onClick={() => enableAB.mutate(diffBase.id)} disabled={enableAB.isPending}>
                              Start A/B Test (v{diffBase.version} as challenger)
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-600 fs--1 p-3">Select a version above to compare</div>
                    )}
                  </div>
                </div>
              )}

              {editMode === 'test' && (
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">Test Evaluation</h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semi-bold">Sample CV (optional)</label>
                        <textarea
                          className="form-control"
                          rows={6}
                          value={testCV}
                          onChange={(e) => setTestCV(e.target.value)}
                          placeholder="Paste CV markdown here…"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semi-bold">Sample JD (optional)</label>
                        <textarea
                          className="form-control"
                          rows={6}
                          value={testJD}
                          onChange={(e) => setTestJD(e.target.value)}
                          placeholder="Paste job description here…"
                        />
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleTest}
                      disabled={testPrompt.isPending}
                    >
                      {testPrompt.isPending ? 'Running…' : 'Run Test Evaluation'}
                    </button>
                    {testOutput && (
                      <pre className="mt-3 p-3 bg-200 rounded fs--2" style={{ maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                        {testOutput}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card mb-3">
              <div className="card-body d-flex align-items-center justify-content-center py-6 text-600">
                Select a template to view or edit
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
