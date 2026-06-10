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
    <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, overflowX: 'auto' }}>
      {Array.from({ length: maxLen }, (_, i) => {
        const aLine = aLines[i] ?? '';
        const bLine = bLines[i] ?? '';
        const changed = aLine !== bLine;
        return (
          <div key={i} style={{ display: 'flex', gap: 0 }}>
            <div style={{
              width: '50%', padding: '1px 8px', borderRight: '1px solid var(--card-border)',
              background: changed ? 'rgba(239,68,68,0.1)' : 'transparent',
              color: changed ? '#ef4444' : 'var(--text)',
            }}>{aLine || ' '}</div>
            <div style={{
              width: '50%', padding: '1px 8px',
              background: changed ? 'rgba(34,197,94,0.1)' : 'transparent',
              color: changed ? '#22c55e' : 'var(--text)',
            }}>{bLine || ' '}</div>
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
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, height: '100%' }}>

        {/* Left panel — template list */}
        <div className="card" style={{ padding: 0, overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', fontWeight: 600, fontSize: 13 }}>
            Templates
          </div>
          {uniqueNames.map((name) => {
            const active = allTemplates.find((t) => t.name === name && t.isActive);
            const hasOverride = data?.orgTemplates?.some((t) => t.name === name);
            return (
              <div
                key={name}
                onClick={() => active && handleSelect(active)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--card-border)',
                  background: selected?.name === name ? 'rgba(93,156,236,0.12)' : 'transparent',
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: selected?.name === name ? 600 : 400 }}>{name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {hasOverride ? '✎ Custom override' : '● System default'}
                  {active && ` · v${active.version}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right panel — editor */}
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* A/B test banner */}
            {abStats?.active && abStats.challengerName === selected.name && (
              <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(234,179,8,0.1)', border: '1px solid var(--warning)', fontSize: 13 }}>
                <strong style={{ color: 'var(--warning)' }}>⚡ A/B test active</strong> — challenger version {abStats.challengerId} vs control
                <button className="btn btn-sm btn-secondary" style={{ marginLeft: 12 }} onClick={() => disableAB.mutate()}>
                  Stop A/B Test
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {['view', 'edit', 'diff', 'test'].map((m) => (
                <button
                  key={m}
                  className={`btn btn-sm ${editMode === m ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setEditMode(m as typeof editMode)}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {editMode === 'view' && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto' }}>
                  {selected.content}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  {selected.orgId ? `Custom override` : 'System default'} · v{selected.version}
                </div>
              </div>
            )}

            {editMode === 'edit' && (
              <div className="card">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={{ width: '100%', minHeight: 400, fontFamily: 'monospace', fontSize: 12, background: 'transparent', color: 'var(--text)', border: 'none', resize: 'vertical', outline: 'none', padding: 8 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 0 0' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditContent(selected.content)}>Reset</button>
                  <button className="btn btn-primary btn-sm" disabled={saveOverride.isPending} onClick={handleSave}>
                    {saveOverride.isPending ? 'Saving…' : 'Save as New Version'}
                  </button>
                </div>
              </div>
            )}

            {editMode === 'diff' && (
              <div className="card">
                <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Compare with version:</label>
                  <select
                    className="form-control"
                    style={{ width: 'auto', padding: '4px 8px' }}
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
                {diffBase ? (
                  <>
                    <div style={{ display: 'flex', gap: 0, marginBottom: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                      <div style={{ width: '50%', padding: '0 8px' }}>v{diffBase.version} (base)</div>
                      <div style={{ width: '50%', padding: '0 8px' }}>v{selected.version} (current)</div>
                    </div>
                    <SimpleDiff a={diffBase.content} b={selected.content} />
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleRollback(diffBase.id)} disabled={rollback.isPending}>
                        Rollback to v{diffBase.version}
                      </button>
                      {!abStats?.active && (
                        <button className="btn btn-sm btn-secondary" onClick={() => enableAB.mutate(diffBase.id)} disabled={enableAB.isPending}>
                          Start A/B Test (v{diffBase.version} as challenger)
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Select a version above to compare</div>
                )}
              </div>
            )}

            {editMode === 'test' && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Sample CV (optional)</label>
                    <textarea
                      className="form-control"
                      rows={6}
                      value={testCV}
                      onChange={(e) => setTestCV(e.target.value)}
                      placeholder="Paste CV markdown here…"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sample JD (optional)</label>
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
                  <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}>
                    {testOutput}
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            Select a template to view or edit
          </div>
        )}
      </div>
    </Layout>
  );
}
