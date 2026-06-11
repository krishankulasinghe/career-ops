import { Layout } from '@/components/layout/Layout';
import { IconInfoCircle } from '@tabler/icons-react';

interface ColorSwatch {
  name: string;
  variable: string;
  hex: string;
  textClass: string;
}

const COLOR_PALETTE: ColorSwatch[] = [
  { name: 'Primary', variable: '--tblr-primary', hex: '#206bc4', textClass: 'text-white' },
  { name: 'Secondary', variable: '--tblr-secondary', hex: '#616876', textClass: 'text-white' },
  { name: 'Success', variable: '--tblr-success', hex: '#2fb344', textClass: 'text-white' },
  { name: 'Info', variable: '--tblr-info', hex: '#4299e1', textClass: 'text-white' },
  { name: 'Warning', variable: '--tblr-warning', hex: '#f76707', textClass: 'text-white' },
  { name: 'Danger', variable: '--tblr-danger', hex: '#d63939', textClass: 'text-white' },
];

export function DesignFilePage() {
  return (
    <Layout title="Design File">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="falcon-design-system" className="docs-anchor mb-3">Tabler Design System</h2>
              <p>
                Career-Ops SaaS is built on the <strong>Tabler v1.4.0</strong> Bootstrap 5 admin
                template. Tabler provides a complete design language — color tokens, typography
                scale, spacing system, component library, and icon set — that ensures visual
                consistency across every page without writing bespoke CSS from scratch.
              </p>
              <p>
                The Tabler stylesheet is loaded globally via <code>index.html</code>. All
                Bootstrap 5 utility classes (<code>d-flex</code>, <code>gap-2</code>,{' '}
                <code>small</code>, etc.) and Tabler component styles are available anywhere
                in the application without additional imports.
              </p>

              <div className="alert alert-info d-flex gap-2 mb-0 mt-2">
                <IconInfoCircle size={16} className="mt-1 flex-shrink-0" />
                <div>
                  <strong>Tabler-specific utilities:</strong> use Bootstrap's <code>small</code>{' '}
                  class for 87.5% font size. <code>bg-*-lt</code> provides light tinted variants
                  for each semantic color (e.g. <code>bg-primary-lt</code>, <code>bg-danger-lt</code>).
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="bootstrap-components" className="docs-anchor mb-3">Bootstrap Components Used</h2>
              <p>
                The following Bootstrap 5 / Tabler components are used throughout the platform.
                Refer to the Tabler documentation at{' '}
                <code>https://tabler.io/docs</code> for usage examples.
              </p>
              <div className="row g-2">
                {[
                  'Card', 'Table', 'Badge', 'Alert', 'Accordion',
                  'Modal', 'Dropdown', 'Nav & Tabs', 'Pagination', 'Spinner',
                  'Toast', 'Tooltip', 'Offcanvas', 'Progress', 'Form Controls',
                ].map((c) => (
                  <div key={c} className="col-auto">
                    <span className="badge bg-secondary-lt small">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="custom-components" className="docs-anchor mb-3">Custom Components</h2>
              <p>
                Beyond Tabler's built-in components, Career-Ops SaaS ships a set of shared
                React components in <code>src/components/shared/</code>:
              </p>

              <div className="table-responsive">
                <table className="table table-sm small mb-0">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>File</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>KPICard</code></td>
                      <td><code>KPICard.tsx</code></td>
                      <td>Metric card with label, value, trend arrow, and optional sparkline</td>
                    </tr>
                    <tr>
                      <td><code>StatusBadge</code></td>
                      <td><code>StatusBadge.tsx</code></td>
                      <td>Color-coded badge for canonical application statuses</td>
                    </tr>
                    <tr>
                      <td><code>ScoreGauge</code></td>
                      <td><code>ScoreGauge.tsx</code></td>
                      <td>ECharts gauge showing evaluation score 0–5</td>
                    </tr>
                    <tr>
                      <td><code>DataTable</code></td>
                      <td><code>DataTable.tsx</code></td>
                      <td>TanStack Table wrapper with sorting, filtering, and pagination</td>
                    </tr>
                    <tr>
                      <td><code>EmptyState</code></td>
                      <td><code>EmptyState.tsx</code></td>
                      <td>Illustrated empty-state panel with optional CTA button</td>
                    </tr>
                    <tr>
                      <td><code>LoadingSpinner</code></td>
                      <td><code>LoadingSpinner.tsx</code></td>
                      <td>Centered Bootstrap spinner for async loading states</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="color-palette" className="docs-anchor mb-3">Color Palette</h2>
              <p>
                The semantic color palette maps directly to Tabler's CSS custom properties.
                Use Bootstrap utility classes (<code>text-primary</code>, <code>bg-success</code>,
                etc.) to stay consistent — avoid hardcoding hex values in component code.
              </p>

              <div className="row g-2 mb-0">
                {COLOR_PALETTE.map((swatch) => (
                  <div key={swatch.name} className="col-sm-6 col-md-4">
                    <div
                      className="rounded-2 p-3 d-flex flex-column"
                      style={{ backgroundColor: swatch.hex }}
                    >
                      <span className={`fw-semibold ${swatch.textClass}`}>{swatch.name}</span>
                      <code className={`small ${swatch.textClass} opacity-75`}>{swatch.hex}</code>
                      <code className={`small ${swatch.textClass} opacity-75`}>{swatch.variable}</code>
                    </div>
                  </div>
                ))}
              </div>
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
                <a className="nav-link py-1 small" href="#falcon-design-system">Tabler Design System</a>
                <a className="nav-link py-1 small" href="#bootstrap-components">Bootstrap Components</a>
                <a className="nav-link py-1 small" href="#custom-components">Custom Components</a>
                <a className="nav-link py-1 small" href="#color-palette">Color Palette</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
