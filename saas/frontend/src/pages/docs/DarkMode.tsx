import { Layout } from '@/components/layout/Layout';
import { IconInfoCircle } from '@tabler/icons-react';

export function DarkModePage() {
  return (
    <Layout title="Dark Mode">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="toggling" className="docs-anchor mb-3">Toggling Dark Mode</h2>
              <p>
                Career-Ops SaaS ships with full Tabler dark mode support. Users toggle dark mode
                from the top navigation bar via the moon/sun icon, or from their{' '}
                <strong>Profile &rarr; Preferences</strong> page. The preference is sent to the
                server so it roams across devices.
              </p>
              <p>
                Tabler implements dark mode by toggling the <code>data-bs-theme="dark"</code>{' '}
                attribute on the <code>{'<html>'}</code> element. All Tabler utility classes,
                component styles, and CSS variables automatically respond to this attribute — no
                separate stylesheet is needed.
              </p>
              <pre className="bg-100 rounded-2 p-3 small overflow-auto">
                <code>{`// useDarkMode.ts
export function useDarkMode() {
  const { preferences } = useAuth();

  useEffect(() => {
    const html = document.documentElement;
    if (preferences.darkMode) {
      html.setAttribute('data-bs-theme', 'dark');
    } else {
      html.removeAttribute('data-bs-theme');
    }
  }, [preferences.darkMode]);
}`}</code>
              </pre>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="persistence" className="docs-anchor mb-3">Persistence</h2>
              <p>
                The dark mode preference is stored server-side in the user's{' '}
                <code>profiles.preferences</code> JSONB column. On initial page load, the
                preference is included in the auth session response so the correct theme is
                applied before the first paint — avoiding the flash of unstyled content (FOUC)
                common with client-only theme persistence.
              </p>

              <div className="alert alert-info d-flex gap-2 mb-3">
                <IconInfoCircle size={16} className="mt-1 flex-shrink-0" />
                <div>
                  For the fastest possible paint, a small inline script in <code>index.html</code>{' '}
                  reads <code>localStorage('theme')</code> as a fallback before the React app
                  mounts. The server preference wins once the session loads.
                </div>
              </div>

              <pre className="bg-100 rounded-2 p-3 small overflow-auto">
                <code>{`<!-- index.html — runs before React mounts -->
<script>
  const theme = localStorage.getItem('career-ops-theme');
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  }
</script>`}</code>
              </pre>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="custom-dark-styles" className="docs-anchor mb-3">Custom Dark Mode Styles</h2>
              <p>
                When writing custom CSS that needs different values in dark mode, use the{' '}
                <code>[data-bs-theme="dark"]</code> selector rather than a media query. This
                matches Tabler's own approach and means the theme responds to user preference
                rather than OS-level settings:
              </p>

              <pre className="bg-100 rounded-2 p-3 small overflow-auto">
                <code>{`/* src/styles/overrides.css */

/* Light mode (default) */
.my-custom-panel {
  background: #f5f7fa;
  border: 1px solid #e2e8f0;
}

/* Dark mode */
[data-bs-theme="dark"] .my-custom-panel {
  background: #1e2a3b;
  border: 1px solid #2d3f55;
}`}</code>
              </pre>

              <p className="mt-3">
                For ECharts charts, pass a separate dark-mode palette to the chart option and
                re-render when the theme changes by watching the <code>data-bs-theme</code>{' '}
                attribute via a <code>MutationObserver</code> or by reading the current theme
                from a React context:
              </p>
              <pre className="bg-100 rounded-2 p-3 small overflow-auto">
                <code>{`const isDark = document.documentElement
  .getAttribute('data-bs-theme') === 'dark';

const option = {
  backgroundColor: isDark ? '#0b1727' : 'transparent',
  textStyle: { color: isDark ? '#9da9bb' : '#5e6e82' },
  // ...
};`}</code>
              </pre>
            </div>
          </div>

        </div>

        <div className="col-lg-3">
          <div className="card sticky-top" style={{ top: 72 }}>
            <div className="card-header">
              <h6 className="mb-0">On this page</h6>
            </div>
            <div className="card-body p-0">
              <nav className="nav flex-column py-2">
                <a className="nav-link py-1 small" href="#toggling">Toggling Dark Mode</a>
                <a className="nav-link py-1 small" href="#persistence">Persistence</a>
                <a className="nav-link py-1 small" href="#custom-dark-styles">Custom Dark Mode Styles</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
