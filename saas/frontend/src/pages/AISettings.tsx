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
      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">AI Settings</h5>
                  <p className="text-secondary small mb-0">Configure your AI provider, model, and generation parameters</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Provider Configuration</h5>
            </div>
            <div className="card-body">

              {/* Provider selector */}
              <div className="mb-3">
                <label className="form-label fw-medium">AI Provider</label>
                <div className="d-flex gap-2 flex-wrap">
                  {(['deepseek', 'gemini', 'openai', 'anthropic'] as const).map((p) => {
                    const isAllowed = allowed.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={!isAllowed}
                        onClick={() => isAllowed && handleProviderChange(p)}
                        className={`btn btn-sm ${form.provider === p ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ opacity: isAllowed ? 1 : 0.4, cursor: isAllowed ? 'pointer' : 'not-allowed' }}
                      >
                        {PROVIDER_LABELS[p]}
                        {!isAllowed && (
                          <span className="badge bg-warning-lt ms-1">PRO+</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model selector */}
              <div className="mb-3">
                <label className="form-label fw-medium">Model</label>
                <select
                  className="form-select"
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                >
                  {(PROVIDER_MODELS[form.provider] ?? []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Temperature */}
              <div className="mb-3">
                <label className="form-label fw-medium">
                  Temperature: <strong>{form.temperature.toFixed(2)}</strong>
                  <small className="text-secondary ms-2">(0 = deterministic · 2 = creative)</small>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={form.temperature}
                  onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
                />
              </div>

              {/* Max tokens */}
              <div className="mb-3">
                <label className="form-label fw-medium">
                  Max Tokens: <strong>{form.maxTokens.toLocaleString()}</strong>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min={256}
                  max={32768}
                  step={256}
                  value={form.maxTokens}
                  onChange={(e) => setForm((f) => ({ ...f, maxTokens: parseInt(e.target.value) }))}
                />
                <div className="d-flex justify-content-between">
                  <small className="text-secondary">256</small>
                  <small className="text-secondary">32 768</small>
                </div>
              </div>

              {/* Fallback */}
              <div className="mb-3">
                <label className="form-label fw-medium">Fallback Provider</label>
                <select
                  className="form-select"
                  value={form.fallbackProvider}
                  onChange={(e) => setForm((f) => ({ ...f, fallbackProvider: e.target.value }))}
                >
                  <option value="">None</option>
                  {(['deepseek', 'gemini', 'openai', 'anthropic'] as const)
                    .filter((p) => p !== form.provider && allowed.includes(p))
                    .map((p) => <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>)}
                </select>
                <small className="form-hint">Used automatically if the primary provider fails</small>
              </div>

              {/* Custom API key */}
              <div className="mb-3">
                <label className="form-label fw-medium">Custom API Key</label>
                {settings?.hasCustomKey && !showKeyInput ? (
                  <div className="d-flex align-items-center gap-3">
                    <span className="text-success small">✓ Custom key configured</span>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowKeyInput(true)}>
                      Replace
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="input-group input-group-flat">
                      <input
                        type="password"
                        className="form-control"
                        value={form.apiKey}
                        onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                        placeholder={`Your ${PROVIDER_LABELS[form.provider]} API key (leave blank to use platform key)`}
                        autoComplete="new-password"
                      />
                    </div>
                    <small className="form-hint">Encrypted with AES-256-GCM before storage. Shown only once.</small>
                  </>
                )}
              </div>

              {/* Test result */}
              {testResult && (
                <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-danger'} small mb-3`} role="alert">
                  {testResult.ok
                    ? `✓ Connected (${testResult.latencyMs}ms)`
                    : `✗ Failed: ${testResult.error}`}
                </div>
              )}

              <div className="card-footer d-flex justify-content-end gap-2">
                <button
                  className="btn btn-outline-secondary"
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
        </div>
      </div>
    </Layout>
  );
}
