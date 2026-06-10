import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAISettings, useUpdateAISettings, useTestAIConnection } from '@/api/aiSettings';
import toast from 'react-hot-toast';

const PROVIDER_MODELS: Record<string, string[]> = {
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro'],
  openai: ['gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
};

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek',
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

export function AISettingsPage() {
  const { data: settings, isLoading } = useAISettings();
  const update = useUpdateAISettings();
  const testConn = useTestAIConnection();

  const [form, setForm] = useState({
    provider: 'deepseek',
    model: '',
    temperature: 0.3,
    maxTokens: 4096,
    fallbackProvider: '' as string,
    apiKey: '',
  });
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs: number; error?: string } | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        provider: settings.provider,
        model: settings.model || PROVIDER_MODELS[settings.provider]?.[0] || '',
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        fallbackProvider: settings.fallbackProvider ?? '',
        apiKey: '',
      });
    }
  }, [settings]);

  const handleProviderChange = (provider: string) => {
    setForm((f) => ({
      ...f,
      provider,
      model: PROVIDER_MODELS[provider]?.[0] ?? '',
    }));
    setTestResult(null);
  };

  const handleSave = async () => {
    const patch: Record<string, unknown> = {
      provider: form.provider,
      model: form.model,
      temperature: form.temperature,
      maxTokens: form.maxTokens,
      fallbackProvider: form.fallbackProvider || null,
    };
    if (form.apiKey) patch['apiKey'] = form.apiKey;
    await update.mutateAsync(patch as Parameters<typeof update.mutateAsync>[0]);
    toast.success('AI settings saved');
    setForm((f) => ({ ...f, apiKey: '' }));
    setShowKeyInput(false);
  };

  const handleTest = async () => {
    const result = await testConn.mutateAsync();
    setTestResult(result);
    if (result.ok) {
      toast.success(`Connection OK (${result.latencyMs}ms)`);
    } else {
      toast.error(`Connection failed: ${result.error}`);
    }
  };

  const allowed = settings?.allowedProviders ?? ['deepseek'];

  if (isLoading) return <Layout title="AI Settings"><LoadingSpinner /></Layout>;

  return (
    <Layout title="AI Settings">
      <div style={{ maxWidth: 640 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Provider Configuration</h3>

          {/* Provider selector */}
          <div className="form-group">
            <label className="form-label">AI Provider</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['deepseek', 'gemini', 'openai', 'anthropic'] as const).map((p) => {
                const isAllowed = allowed.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={!isAllowed}
                    onClick={() => isAllowed && handleProviderChange(p)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: `2px solid ${form.provider === p ? 'var(--primary)' : 'var(--card-border)'}`,
                      background: form.provider === p ? 'rgba(93,156,236,0.15)' : 'transparent',
                      color: isAllowed ? 'var(--text)' : 'var(--text-muted)',
                      cursor: isAllowed ? 'pointer' : 'not-allowed',
                      opacity: isAllowed ? 1 : 0.4,
                      fontSize: 13,
                      fontWeight: form.provider === p ? 600 : 400,
                      position: 'relative',
                    }}
                  >
                    {PROVIDER_LABELS[p]}
                    {!isAllowed && (
                      <span style={{ fontSize: 10, marginLeft: 4, color: 'var(--warning)' }}>PRO+</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model selector */}
          <div className="form-group">
            <label className="form-label">Model</label>
            <select
              className="form-control"
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            >
              {(PROVIDER_MODELS[form.provider] ?? []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div className="form-group">
            <label className="form-label">
              Temperature: <strong>{form.temperature.toFixed(2)}</strong>
              <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>
                (0 = deterministic · 2 = creative)
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={form.temperature}
              onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Max tokens */}
          <div className="form-group">
            <label className="form-label">
              Max Tokens: <strong>{form.maxTokens.toLocaleString()}</strong>
            </label>
            <input
              type="range"
              min={256}
              max={32768}
              step={256}
              value={form.maxTokens}
              onChange={(e) => setForm((f) => ({ ...f, maxTokens: parseInt(e.target.value) }))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>256</span><span>32 768</span>
            </div>
          </div>

          {/* Fallback */}
          <div className="form-group">
            <label className="form-label">Fallback Provider</label>
            <select
              className="form-control"
              value={form.fallbackProvider}
              onChange={(e) => setForm((f) => ({ ...f, fallbackProvider: e.target.value }))}
            >
              <option value="">None</option>
              {(['deepseek', 'gemini', 'openai', 'anthropic'] as const)
                .filter((p) => p !== form.provider && allowed.includes(p))
                .map((p) => <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>)}
            </select>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Used automatically if the primary provider fails
            </div>
          </div>

          {/* Custom API key */}
          <div className="form-group">
            <label className="form-label">Custom API Key</label>
            {settings?.hasCustomKey && !showKeyInput ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--success)' }}>✓ Custom key configured</span>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowKeyInput(true)}>
                  Replace
                </button>
              </div>
            ) : (
              <>
                <input
                  type="password"
                  className="form-control"
                  value={form.apiKey}
                  onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                  placeholder={`Your ${PROVIDER_LABELS[form.provider]} API key (leave blank to use platform key)`}
                  autoComplete="new-password"
                />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Encrypted with AES-256-GCM before storage. Shown only once.
                </div>
              </>
            )}
          </div>

          {/* Test result */}
          {testResult && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 6,
              background: testResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${testResult.ok ? 'var(--success)' : 'var(--danger)'}`,
              fontSize: 13,
              marginBottom: 16,
            }}>
              {testResult.ok
                ? `✓ Connected (${testResult.latencyMs}ms)`
                : `✗ Failed: ${testResult.error}`}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-secondary"
              onClick={handleTest}
              disabled={testConn.isPending}
            >
              {testConn.isPending ? 'Testing…' : 'Test Connection'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={update.isPending}
            >
              {update.isPending ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
