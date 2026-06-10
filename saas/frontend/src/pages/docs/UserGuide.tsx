import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';

interface DocCard {
  title: string;
  description: string;
  icon: string;
  href: string;
}

const DOC_CARDS: DocCard[] = [
  {
    title: 'Getting Started',
    description: 'Install, configure, and run your first job evaluation in minutes.',
    icon: 'fas fa-rocket',
    href: '/docs/getting-started',
  },
  {
    title: 'FAQ',
    description: 'Answers to the most common questions about evaluations, billing, and security.',
    icon: 'fas fa-question-circle',
    href: '/docs/faq',
  },
  {
    title: 'Configuration',
    description: 'Environment variables, feature flags, and AI provider settings.',
    icon: 'fas fa-sliders-h',
    href: '/docs/configuration',
  },
  {
    title: 'Styling',
    description: 'Customize the look and feel with Falcon CSS variables and custom overrides.',
    icon: 'fas fa-paint-brush',
    href: '/docs/styling',
  },
  {
    title: 'Dark Mode',
    description: 'How dark mode works, how to toggle it, and how to write dark-mode-aware styles.',
    icon: 'fas fa-moon',
    href: '/docs/dark-mode',
  },
  {
    title: 'Plugins',
    description: 'Extend Career-Ops with the open agent skill standard and custom CLI skills.',
    icon: 'fas fa-plug',
    href: '/docs/plugin',
  },
  {
    title: 'Build & Tooling',
    description: 'Development server, production builds, testing, and CI/CD pipeline.',
    icon: 'fas fa-tools',
    href: '/docs/gulp',
  },
  {
    title: 'Design File',
    description: 'Design system, Bootstrap components, custom components, and color palette.',
    icon: 'fas fa-drafting-compass',
    href: '/docs/design-file',
  },
  {
    title: 'Changelog',
    description: 'Release history — what changed in each version of Career-Ops SaaS.',
    icon: 'fas fa-history',
    href: '/docs/changelog',
  },
];

export function UserGuidePage() {
  return (
    <Layout title="Documentation">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-4">
            <div className="card-body">
              <h2 id="overview" className="docs-anchor mb-3">Documentation Overview</h2>
              <p>
                Welcome to the Career-Ops SaaS documentation. This is the central index for
                everything you need to run, configure, and extend the platform. Whether you are
                setting up for the first time or looking for advanced configuration options,
                you will find it here.
              </p>
              <p className="mb-0">
                The docs are organized by topic. Each page has an anchor-link sidebar so you can
                jump directly to the section you need. If something is missing or unclear, open a
                GitHub issue — documentation improvements are always welcome.
              </p>
            </div>
          </div>

          <h5 id="all-docs" className="docs-anchor mb-3">All Documentation Pages</h5>
          <div className="row g-3 mb-3">
            {DOC_CARDS.map((card) => (
              <div key={card.href} className="col-md-6 col-xl-4">
                <div className="card h-100 hover-shadow">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex align-items-center mb-2 gap-2">
                      <span className={`${card.icon} text-primary fs-4`}></span>
                      <h6 className="mb-0">{card.title}</h6>
                    </div>
                    <p className="text-600 fs--1 flex-grow-1 mb-3">{card.description}</p>
                    <Link to={card.href} className="btn btn-sm btn-falcon-primary">
                      Read docs <span className="fas fa-arrow-right ms-1"></span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-body">
              <h5 id="contributing" className="docs-anchor mb-3">Contributing to the Docs</h5>
              <p>
                Documentation lives alongside the source code in the <code>saas/frontend/src/pages/docs/</code>{' '}
                directory. Each page is a React component — edit the TSX file and submit a PR.
                All docs follow the same two-column layout with a sticky anchor sidebar.
              </p>
              <p className="mb-0">
                Before contributing, read <code>CONTRIBUTING.md</code> and make sure the CI checks
                pass. The GitHub Actions workflow runs TypeScript type-checking and ESLint on every
                pull request.
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
                <a className="nav-link py-1 fs--1" href="#overview">Overview</a>
                <a className="nav-link py-1 fs--1" href="#all-docs">All Documentation Pages</a>
                <a className="nav-link py-1 fs--1" href="#contributing">Contributing</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
