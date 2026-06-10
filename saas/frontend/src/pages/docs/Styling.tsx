import { Layout } from '@/components/layout/Layout';

export function StylingPage() {
  return (
    <Layout title="Styling">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="falcon-css-variables" className="docs-anchor mb-3">Falcon CSS Variables</h2>
              <p>
                Career-Ops SaaS uses <strong>Falcon v3.14.0</strong> as its CSS foundation.
                Falcon exposes a comprehensive set of CSS custom properties (variables) that
                control colors, typography, spacing, border radii, and shadows — all scoped
                under the <code>:root</code> selector so they cascade throughout the component
                tree without any build step.
              </p>
              <p>Key variable groups include:</p>
              <ul>
                <li><strong>Color palette</strong> — <code>--falcon-primary</code>, <code>--falcon-secondary</code>, semantic colors for success/warning/danger/info</li>
                <li><strong>Typography</strong> — <code>--falcon-font-sans-serif</code>, <code>--falcon-font-monospace</code>, base font size</li>
                <li><strong>Surfaces</strong> — <code>--falcon-card-bg</code>, <code>--falcon-body-bg</code>, sidebar and navbar background</li>
                <li><strong>Borders &amp; radii</strong> — <code>--falcon-border-color</code>, <code>--falcon-border-radius</code></li>
              </ul>

              <p>Look up any variable in the browser DevTools or in the Falcon source:</p>
              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`/* falcon-v3.14.0/public/assets/css/theme.min.css */
:root {
  --falcon-primary: #2c7be5;
  --falcon-card-bg: #fff;
  --falcon-body-bg: #edf2f9;
  ...
}`}</code>
              </pre>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="custom-overrides" className="docs-anchor mb-3">Custom Overrides</h2>
              <p>
                The recommended way to customize the theme is to add your overrides to{' '}
                <code>src/styles/overrides.css</code>. This file is imported after the Falcon
                stylesheet, so your rules take precedence without modifying vendor files.
              </p>

              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`/* src/styles/overrides.css */

/* Change the primary brand color */
:root {
  --falcon-primary: #5e50f9;
  --falcon-primary-rgb: 94, 80, 249;
}

/* Tighten up the sidebar width */
.navbar-vertical.navbar-expand-xl {
  max-width: 220px;
}

/* Custom card shadow */
.card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}`}</code>
              </pre>

              <div className="alert alert-info d-flex gap-2 mb-0 mt-3">
                <span className="fas fa-info-circle mt-1"></span>
                <div>
                  Always override variables at the <code>:root</code> level where possible.
                  Component-level overrides are harder to maintain when Falcon is upgraded.
                  Prefer updating CSS variables over writing new selectors.
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="branding-settings" className="docs-anchor mb-3">Branding Settings</h2>
              <p>
                Organization-level branding is managed through the <strong>Branding Settings</strong>{' '}
                page (<code>/settings/branding</code>). Admins can upload a logo, set a primary
                color, and configure the platform display name. These values are stored in the
                organization's <code>settings</code> JSONB column and applied at runtime via
                CSS custom property injection in the <code>{'<head>'}</code>.
              </p>

              <h5 className="mt-3">How runtime theming works</h5>
              <p>
                When the app loads, the <code>useOrg</code> hook fetches the org's branding settings
                and injects a <code>{'<style>'}</code> tag that overrides the root CSS variables:
              </p>
              <pre className="bg-100 rounded-2 p-3 fs--1 overflow-auto">
                <code>{`// Applied dynamically by BrandingProvider
document.documentElement.style.setProperty(
  '--falcon-primary',
  org.settings.branding.primaryColor
);`}</code>
              </pre>

              <p className="mb-0">
                This means branding changes take effect immediately after saving — no build or
                redeploy required. The approach works for both light and dark mode because Falcon's
                dark mode palette is derived from the same CSS variables.
              </p>
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
                <a className="nav-link py-1 fs--1" href="#falcon-css-variables">Falcon CSS Variables</a>
                <a className="nav-link py-1 fs--1" href="#custom-overrides">Custom Overrides</a>
                <a className="nav-link py-1 fs--1" href="#branding-settings">Branding Settings</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
