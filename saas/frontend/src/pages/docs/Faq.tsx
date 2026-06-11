import { Layout } from '@/components/layout/Layout';

export function FaqPage() {
  return (
    <Layout title="FAQ">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="general" className="docs-anchor mb-3">General</h2>

              <div className="accordion" id="faqGeneral">

                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#faq-g1"
                    >
                      What is Career-Ops SaaS?
                    </button>
                  </h2>
                  <div id="faq-g1" className="accordion-collapse collapse show" data-bs-parent="#faqGeneral">
                    <div className="accordion-body small">
                      Career-Ops SaaS is a hosted, multi-tenant web platform built on the
                      open-source Career-Ops CLI. It brings AI-powered job offer evaluation,
                      automated portal scanning, PDF report generation, and application
                      pipeline tracking into a single collaborative dashboard — without
                      requiring you to run anything locally.
                    </div>
                  </div>
                </div>

                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#faq-g2"
                    >
                      Do I need to install anything to use it?
                    </button>
                  </h2>
                  <div id="faq-g2" className="accordion-collapse collapse" data-bs-parent="#faqGeneral">
                    <div className="accordion-body small">
                      For the hosted version, no — just a browser. If you are self-hosting,
                      you need Docker (for Postgres, Redis, MinIO), Node.js 20+, and an AI
                      provider API key. See the Getting Started guide for full instructions.
                    </div>
                  </div>
                </div>

                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#faq-g3"
                    >
                      How is Career-Ops SaaS different from the open-source CLI?
                    </button>
                  </h2>
                  <div id="faq-g3" className="accordion-collapse collapse" data-bs-parent="#faqGeneral">
                    <div className="accordion-body small">
                      The CLI runs locally on your machine via an AI coding assistant. The SaaS
                      wraps the same evaluation logic in a full-stack web application with
                      persistent storage, team collaboration, a visual dashboard, billing metering,
                      SSO, and a REST API. You get the same quality of evaluations without
                      needing to keep a terminal open.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="evaluations" className="docs-anchor mb-3">Evaluations</h2>

              <div className="accordion" id="faqEvals">

                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#faq-e1"
                    >
                      How long does an evaluation take?
                    </button>
                  </h2>
                  <div id="faq-e1" className="accordion-collapse collapse show" data-bs-parent="#faqEvals">
                    <div className="accordion-body small">
                      Most evaluations complete in 15–45 seconds. The system fetches the job
                      description, runs liveness verification via Playwright, builds a prompt
                      against your profile, calls the AI provider, and generates a PDF report —
                      all asynchronously. You can navigate away and come back; the dashboard
                      updates automatically when the task finishes.
                    </div>
                  </div>
                </div>

                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#faq-e2"
                    >
                      What scoring scale is used?
                    </button>
                  </h2>
                  <div id="faq-e2" className="accordion-collapse collapse" data-bs-parent="#faqEvals">
                    <div className="accordion-body small">
                      Offers are scored on a 0–5 scale across six blocks: Company (market
                      position, funding, trajectory), Role (title, scope, tech stack), Compensation
                      (base, equity, bonus, benefits), Culture (remote policy, team signals),
                      Growth (learning, career path), and Legitimacy (posting freshness, company
                      verification). The weighted average produces the final score. Offers below
                      4.0 are flagged as low-fit.
                    </div>
                  </div>
                </div>

                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#faq-e3"
                    >
                      Can I re-evaluate an offer after updating my profile?
                    </button>
                  </h2>
                  <div id="faq-e3" className="accordion-collapse collapse" data-bs-parent="#faqEvals">
                    <div className="accordion-body small">
                      Yes. From the evaluation detail page, click <strong>Re-evaluate</strong>.
                      The system will use your current profile and the latest prompt templates.
                      The previous evaluation is preserved in history so you can compare scores
                      before and after the profile update.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="billing" className="docs-anchor mb-3">Billing</h2>

              <div className="accordion" id="faqBilling">

                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#faq-b1"
                    >
                      How is usage metered?
                    </button>
                  </h2>
                  <div id="faq-b1" className="accordion-collapse collapse show" data-bs-parent="#faqBilling">
                    <div className="accordion-body small">
                      Usage is tracked per organization by the number of AI tokens consumed.
                      Every evaluation, scan, and PDF generation records tokens-in, tokens-out,
                      and the estimated cost in USD to the <code>usage_records</code> table.
                      The billing dashboard shows your current period usage and projected cost.
                    </div>
                  </div>
                </div>

                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#faq-b2"
                    >
                      What happens when I hit my usage limit?
                    </button>
                  </h2>
                  <div id="faq-b2" className="accordion-collapse collapse" data-bs-parent="#faqBilling">
                    <div className="accordion-body small">
                      New AI tasks will return a <code>UsageLimitError</code> and the evaluation
                      will be queued but not processed. You will receive an email notification.
                      Upgrading your plan or purchasing additional credits immediately unlocks
                      the queued tasks.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="security" className="docs-anchor mb-3">Security</h2>

              <div className="accordion" id="faqSecurity">

                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#faq-s1"
                    >
                      How are API keys stored?
                    </button>
                  </h2>
                  <div id="faq-s1" className="accordion-collapse collapse show" data-bs-parent="#faqSecurity">
                    <div className="accordion-body small">
                      API keys are stored as SHA-256 hashes. The raw key is shown exactly once
                      at creation time — after that it is unrecoverable. If you lose a key, revoke
                      it and generate a new one from the API Keys settings page.
                    </div>
                  </div>
                </div>

                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#faq-s2"
                    >
                      Is my CV and job data kept private?
                    </button>
                  </h2>
                  <div id="faq-s2" className="accordion-collapse collapse" data-bs-parent="#faqSecurity">
                    <div className="accordion-body small">
                      All data is scoped to your organization. No data is shared between tenants.
                      CV content and evaluation reports are stored in S3-compatible storage with
                      per-org path prefixes and short-lived signed URLs. Data residency options
                      (EU, US, APAC) are available on enterprise plans.
                    </div>
                  </div>
                </div>

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
                <a className="nav-link py-1 small" href="#general">General</a>
                <a className="nav-link py-1 small" href="#evaluations">Evaluations</a>
                <a className="nav-link py-1 small" href="#billing">Billing</a>
                <a className="nav-link py-1 small" href="#security">Security</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
