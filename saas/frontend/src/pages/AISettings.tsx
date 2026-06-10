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
      <div className="row g-3">
        <div className="col-12">
          <div className="card mb-3">
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <h5 className="mb-0">AI Settings</h5>
                  <p className="text-600 fs--1 mb-0">Configure your AI provider, model, and generation parameters</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="mb-0">Provider Configuration</h5>
            </div>
            <div className="card-body">

              {/* Provider selector */}
              <div className="mb-3">
                <label className="form-label fw-semi-bold">AI Provider</label>
                <div className="d-flex gap-2 flex-wrap">
                  {(['deepseek', 'gemini', 'openai', 'anthropic'] as const).map((p) => {
                    const isAllowed = allowed.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={!isAllowed}
                        onClick={() => isAllowed && handleProviderChange(p)}
                        className={`btn btn-sm ${form.provider === p ? 'btn-primary' : 'btn-falcon-default'}`}
                        style={{ opacity: isAllowed ? 1 : 0.4, cursor: isAllowed ? 'pointer' : 'not-allowed' }}
                      >
                        {PROVIDER_LABELS[p]}
                        {!isAllowed && (
                          <span className="badge badge-soft-warning ms-1 fs--2">PRO+</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model selector */}
              <div className="mb-3">
                <label className="form-label fw-semi-bold">Model</label>
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
                <label className="form-label fw-semi-bold">
                  Temperature: <strong>{form.temperature.toFixed(2)}</strong>
                  <small className="text-600 ms-2">(0 = deterministic · 2 = creative)</small>
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
                <label className="form-label fw-semi-bold">
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
                  <small className="text-600">256</small>
                  <small className="text-600">32 768</small>
                </div>
              </div>

              {/* Fallback */}
              <div className="mb-3">
                <label className="form-label fw-semi-bold">Fallback Provider</label>
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
                <small className="form-text text-500">Used automatically if the primary provider fails</small>
              </div>

              {/* Custom API key */}
              <div className="mb-3">
                <label className="form-label fw-semi-bold">Custom API Key</label>
                {settings?.hasCustomKey && !showKeyInput ? (
                  <div className="d-flex align-items-center gap-3">
                    <span className="text-success fs--1">✓ Custom key configured</span>
                    <button className="btn btn-falcon-default btn-sm" onClick={() => setShowKeyInput(true)}>
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
                    <small className="form-text text-500">Encrypted with AES-256-GCM before storage. Shown only once.</small>
                  </>
                )}
              </div>

              {/* Test result */}
              {testResult && (
                <div className={`alert ${testResult.ok ? 'alert-success' : 'alert-danger'} fs--1 mb-3`} role="alert">
                  {testResult.ok
                    ? `✓ Connected (${testResult.latencyMs}ms)`
                    : `✗ Failed: ${testResult.error}`}
                </div>
              )}

              <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                <button
                  className="btn btn-falcon-default"
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
