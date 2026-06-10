import { Layout } from '@/components/layout/Layout';

interface ColorSwatch {
  name: string;
  variable: string;
  hex: string;
  textClass: string;
}

const COLOR_PALETTE: ColorSwatch[] = [
  { name: 'Primary', variable: '--falcon-primary', hex: '#2c7be5', textClass: 'text-white' },
  { name: 'Secondary', variable: '--falcon-secondary', hex: '#748194', textClass: 'text-white' },
  { name: 'Success', variable: '--falcon-success', hex: '#00d27a', textClass: 'text-dark' },
  { name: 'Info', variable: '--falcon-info', hex: '#27bcfd', textClass: 'text-dark' },
  { name: 'Warning', variable: '--falcon-warning', hex: '#f5803e', textClass: 'text-white' },
  { name: 'Danger', variable: '--falcon-danger', hex: '#e63757', textClass: 'text-white' },
];

export function DesignFilePage() {
  return (
    <Layout title="Design File">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="falcon-design-system" className="docs-anchor mb-3">Falcon Design System</h2>
              <p>
                Career-Ops SaaS is built on the <strong>Falcon v3.14.0</strong> Bootstrap 5 admin
                template. Falcon provides a complete design language — color tokens, typography
                scale, spacing system, component library, and icon set — that ensures visual
                consistency across every page without writing bespoke CSS from scratch.
              </p>
              <p>
                The Falcon stylesheet is loaded globally via <code>index.html</code>. All
                Bootstrap 5 utility classes (<code>d-flex</code>, <code>gap-2</code>,{' '}
                <code>fs--1</code>, etc.) and Falcon component styles are available anywhere
                in the application without additional imports.
              </p>

              <div className="alert alert-info d-flex gap-2 mb-0 mt-2">
                <span className="fas fa-info-circle mt-1"></span>
                <div>
                  <strong>Falcon-specific utilities:</strong> <code>fs--1</code> and <code>fs--2</code>{' '}
                  set font size to 87.5% and 75% of the base size respectively. <code>bg-100</code>,{' '}
                  <code>bg-200</code>, … <code>bg-900</code> are Falcon's neutral surface steps.
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="bootstrap-components" className="docs-anchor mb-3">Bootstrap Components Used</h2>
              <p>
                The following Bootstrap 5 / Falcon components are used throughout the platform.
                Refer to the Falcon documentation in{' '}
                <code>falcon-v3.14.0/public/documentation/</code> for usage examples.
              </p>
              <div className="row g-2">
                {[
                  'Card', 'Table', 'Badge', 'Alert', 'Accordion',
                  'Modal', 'Dropdown', 'Nav & Tabs', 'Pagination', 'Spinner',
                  'Toast', 'Tooltip', 'Offcanvas', 'Progress', 'Form Controls',
                ].map((c) => (
                  <div key={c} className="col-auto">
                    <span className="badge bg-200 text-700 fs--1">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="custom-components" className="docs-anchor mb-3">Custom Components</h2>
              <p>
                Beyond Falcon's built-in components, Career-Ops SaaS ships a set of shared
                React components in <code>src/components/shared/</code>:
              </p>

              <div className="table-responsive">
                <table className="table table-sm fs--1 mb-0">
                  <thead className="bg-200">
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
                The semantic color palette maps directly to Falcon's CSS custom properties.
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
                      <code className={`fs--2 ${swatch.textClass} opacity-75`}>{swatch.hex}</code>
                      <code className={`fs--2 ${swatch.textClass} opacity-75`}>{swatch.variable}</code>
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
                <a className="nav-link py-1 fs--1" href="#falcon-design-system">Falcon Design System</a>
                <a className="nav-link py-1 fs--1" href="#bootstrap-components">Bootstrap Components</a>
                <a className="nav-link py-1 fs--1" href="#custom-components">Custom Components</a>
                <a className="nav-link py-1 fs--1" href="#color-palette">Color Palette</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
