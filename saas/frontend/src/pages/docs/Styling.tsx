import { Layout } from '@/components/layout/Layout';
import { IconInfoCircle } from '@tabler/icons-react';

export function StylingPage() {
  return (
    <Layout title="Styling">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="falcon-css-variables" className="docs-anchor mb-3">Tabler CSS Variables</h2>
              <p>
                Career-Ops SaaS uses <strong>Tabler v1.4.0</strong> as its CSS foundation.
                Tabler exposes a comprehensive set of CSS custom properties (variables) that
                control colors, typography, spacing, border radii, and shadows — all scoped
                under the <code>:root</code> selector so they cascade throughout the component
                tree without any build step.
              </p>
              <p>Key variable groups include:</p>
              <ul>
                <li><strong>Color palette</strong> — <code>--tblr-primary</code>, <code>--tblr-secondary</code>, semantic colors for success/warning/danger/info</li>
                <li><strong>Typography</strong> — <code>--tblr-font-sans-serif</code>, <code>--tblr-font-monospace</code>, base font size</li>
                <li><strong>Surfaces</strong> — <code>--tblr-card-bg</code>, <code>--tblr-body-bg</code>, sidebar and navbar background</li>
                <li><strong>Borders &amp; radii</strong> — <code>--tblr-border-color</code>, <code>--tblr-border-radius</code></li>
              </ul>

              <p>Look up any variable in the browser DevTools or in the Tabler source:</p>
              <pre className="bg-100 rounded-2 p-3 small overflow-auto">
                <code>{`/* @tabler/core/dist/css/tabler.min.css */
:root {
  --tblr-primary: #206bc4;
  --tblr-card-bg: #fff;
  --tblr-body-bg: #f4f6fa;
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
                <code>src/styles/overrides.css</code>. This file is imported after the Tabler
                stylesheet, so your rules take precedence without modifying vendor files.
              </p>

              <pre className="bg-100 rounded-2 p-3 small overflow-auto">
                <code>{`/* src/styles/overrides.css */

/* Change the primary brand color */
:root {
  --tblr-primary: #5e50f9;
  --tblr-primary-rgb: 94, 80, 249;
}

/* Custom card shadow */
.card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}`}</code>
              </pre>

              <div className="alert alert-info d-flex gap-2 mb-0 mt-3">
                <IconInfoCircle size={16} className="mt-1 flex-shrink-0" />
                <div>
                  Always override variables at the <code>:root</code> level where possible.
                  Component-level overrides are harder to maintain when Tabler is upgraded.
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
              <pre className="bg-100 rounded-2 p-3 small overflow-auto">
                <code>{`// Applied dynamically by BrandingProvider
document.documentElement.style.setProperty(
  '--tblr-primary',
  org.settings.branding.primaryColor
);`}</code>
              </pre>

              <p className="mb-0">
                This means branding changes take effect immediately after saving — no build or
                redeploy required. The approach works for both light and dark mode because Tabler's
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
                <a className="nav-link py-1 small" href="#falcon-css-variables">Tabler CSS Variables</a>
                <a className="nav-link py-1 small" href="#custom-overrides">Custom Overrides</a>
                <a className="nav-link py-1 small" href="#branding-settings">Branding Settings</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
