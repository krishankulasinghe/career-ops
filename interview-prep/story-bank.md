# Story Bank — Master STAR+R Stories

This file accumulates your best interview stories over time. Each evaluation (Block F) adds new stories here. Instead of memorizing 100 answers, maintain 5-10 deep stories that you can bend to answer almost any behavioral question.

## How it works

1. Every time `/career-ops oferta` generates Block F (Interview Plan), new STAR+R stories get appended here
2. Before your next interview, review this file — your stories are already organized by theme
3. The "Big Three" questions can be answered with stories from this bank:
   - "Tell me about yourself" → combine 2-3 stories into a narrative
   - "Tell me about your most impactful project" → pick your highest-impact story
   - "Tell me about a conflict you resolved" → find a story with a Reflection

## Stories

<!-- Stories will be added here as you evaluate offers -->
<!-- Format:
### [Theme] Story Title
**Source:** Report #NNN — Company — Role
**S (Situation):** ...
**T (Task):** ...
**A (Action):** ...
**R (Result):** ...
**Reflection:** What I learned / what I'd do differently
**Best for questions about:** [list of question types this story answers]
-->

---

### [Quality / Testing] Test Coverage Uplift at Acuity Brands
**Source:** Report #001 — Veeva Systems — Senior Software Engineer C#
**S (Situation):** The microservices codebase at Acuity Brands had sparse test coverage (~30%), making refactoring and new feature delivery risky and slow.
**T (Task):** Establish a testing culture and increase coverage meaningfully without halting feature delivery.
**A (Action):** Introduced xUnit as standard test framework, NSubstitute for clean mocking, Testcontainers for integration tests against real PostgreSQL instances, and WireMock.Net for external API contracts. Ran internal demos, defined coverage gates in CI pipeline, paired with teammates on their first integration tests.
**R (Result):** Test coverage rose from ~30% to 80%. New features shipped with confidence; regression rate dropped.
**Reflection:** The key insight was making testing feel productive, not punitive — starting with easy wins before tackling harder integration layers.
**Best for questions about:** Code quality, testing culture, continuous improvement, mentorship through practice

---

### [Delivery / Ownership] Risk-Management Tool — 5 Bug-Free Releases at Wells Fargo
**Source:** Report #001 — Veeva Systems — Senior Software Engineer C#
**S (Situation):** A critical risk-management tool had to be delivered across a distributed team with zero defect tolerance — regulatory context meant bugs were not an option.
**T (Task):** Own delivery plan, architecture decisions, team coordination, and quality gates across 5 releases as tech lead.
**A (Action):** Introduced Clean Architecture template to standardize codebase, enforced code review norms, coordinated Agile ceremonies, and set up release checklists validated by every engineer before a build went to production.
**R (Result):** 5 consecutive bug-free releases in a regulatory-grade environment with a distributed team.
**Reflection:** Repeatability over heroics — the checklist and template meant quality wasn't dependent on individual vigilance.
**Best for questions about:** End-to-end ownership, quality under pressure, distributed team leadership, delivery reliability

---

### [Architecture / MVVM] Cross-Platform MVVM at Empite
**Source:** Report #001 — Veeva Systems — Senior Software Engineer C#
**S (Situation):** At Empite, building a cross-platform mobile solution across 5 diverse applications; needed a maintainable UI architecture pattern.
**T (Task):** Choose and implement a UI architecture pattern that would keep the codebase consistent and maintainable as the team grew.
**A (Action):** Implemented MVVM using Xamarin Forms and XAML. Defined ViewModel layer, established data binding conventions, separated business logic from UI, documented pattern for team adoption.
**R (Result):** Consistent UI architecture across 5 applications in Charity, Travel, and Healthcare domains; faster developer onboarding due to predictability.
**Reflection:** MVVM's real value is in the seams — testable ViewModels without instantiating Views. That discipline paid off during refactoring.
**Best for questions about:** MVVM, UI architecture, cross-platform development, engineering standards

---

### [Debugging] Production Stability at Greenwich Lanka
**Source:** Report #001 — Veeva Systems — Senior Software Engineer C#
**S (Situation):** Production systems had intermittent availability issues affecting end users — symptoms were vague and logs inconsistent.
**T (Task):** Diagnose and fix production instability without full visibility into root cause.
**A (Action):** Established structured log analysis, added targeted performance profiling to isolate slow DB queries, implemented systematic debugging (binary search through code paths, isolating environmental factors). Tuned SQL queries and fixed memory-related issues.
**R (Result):** Restored high system availability; proactively addressed a broader performance improvement opportunity discovered during investigation.
**Reflection:** Production debugging is about ruling things out systematically. Log-first analysis is now something I apply early, not as a last resort.
**Best for questions about:** Debugging, production incident response, systematic problem-solving, attention to detail

---

### [Mentorship] Raising Team Standards at Wells Fargo
**Source:** Report #001 — Veeva Systems — Senior Software Engineer C#
**S (Situation):** Junior developers on my Wells Fargo team were inconsistent in code quality — varied conventions, untested changes, architectural shortcuts creating technical debt.
**T (Task):** Raise team standards without creating a culture of fear around code review.
**A (Action):** Ran structured code reviews with written feedback, paired with individuals on specific patterns (Clean Architecture, REST conventions), created a shared "good/bad examples" reference doc. Framed feedback around downstream impact (maintainability, testability) rather than personal critique.
**R (Result):** Measurable improvement in code quality and review pass rates; junior developers began proactively requesting review before submitting PRs.
**Reflection:** Mentorship works best when the mentee sees the "why." Connecting feedback to downstream impact made the lessons stick.
**Best for questions about:** Mentorship, code review culture, team development, technical leadership

---

### [Performance / Legacy] SQL Optimization at Wells Fargo
**Source:** Report #001 — Veeva Systems — Senior Software Engineer C#
**S (Situation):** Legacy SQL Server stored procedures and T-SQL views were causing slow performance in a risk-management application used daily by analysts.
**T (Task):** Improve query performance without re-architecting the data layer from scratch.
**A (Action):** Profiled execution plans, identified missing indexes, rewrote stored procedures to eliminate cursor-based loops in favor of set-based operations, refactored complex views into targeted queries. Coordinated with DBAs to test in lower environments before production.
**R (Result):** 25% reduction in query execution time — analysts noticed immediately.
**Reflection:** Most performance problems have a 20% of root causes explaining 80% of slowness. Finding that 20% quickly via execution plans (not guesswork) is the skill.
**Best for questions about:** Performance optimization, legacy modernization, SQL/database, attention to impact

---

### [DevOps / Reliability] CI/CD Pipeline Automation at Empite
**Source:** Report #001 — Veeva Systems — Senior Software Engineer C#
**S (Situation):** Manual deployment processes for 5 applications at Empite were error-prone — environment mismatches and forgotten config changes caused recurring production incidents.
**T (Task):** Establish a repeatable, automated deployment process.
**A (Action):** Built CI/CD pipelines using TeamCity for build automation and Octopus Deploy for environment-specific deployments. Defined environment promotion rules, added automated smoke tests post-deploy, documented runbook for team self-service.
**R (Result):** Significantly reduced manual deployment errors; release cycles became predictable and low-stress events.
**Reflection:** The goal of CI/CD isn't speed — it's confidence. Once engineers trust the pipeline, they deploy more frequently, which reduces risk further (smaller changes = smaller blast radius).
**Best for questions about:** CI/CD, DevOps, deployment reliability, process improvement, reducing operational risk

---

### [Security Engineering] JWT Authentication and Authorization at Infosys
**Source:** Report #002 — Veeva Systems — Senior Software Engineer C# (Pleasanton)
**S (Situation):** At Infosys, the application had weak authentication — session tokens were long-lived with no refresh mechanism, exposing users to session hijacking risk. An internal review had flagged this as a security gap.
**T (Task):** Re-architect the authentication layer to meet enterprise security standards.
**A (Action):** Designed and implemented JWT authentication with short-lived access tokens and refresh token rotation. Added granular role and permission controls using claims-based authorization. Established secure token storage patterns on the client side and validated the design against OWASP session management guidelines.
**R (Result):** The application passed an internal security review that the previous implementation had failed. The new auth system eliminated the previously flagged session hijacking risk.
**Reflection:** Security is not a feature — it is a constraint that must be designed in from the start. Retrofitting security is always more expensive and more fragile than building it right the first time.
**Best for questions about:** Security, authentication, authorization, JWT, role-based access control, OWASP compliance

---

### [Messaging / Reliability] Azure Service Bus Email Delivery at Infosys
**Source:** Report #002 — Veeva Systems — Senior Software Engineer C# (Pleasanton)
**S (Situation):** At Infosys, an email delivery system was experiencing intermittent silent message loss, causing customer-facing notifications to fail without any error surfacing to the engineering team.
**T (Task):** Diagnose the root cause of the silent failures and re-architect the messaging layer for reliability.
**A (Action):** Investigated the failure pattern and identified that the system was not handling dead-letter queues or transient Azure Service Bus failures properly. Rebuilt the email delivery system on Azure Service Bus with proper dead-lettering, exponential backoff retry policies, and alerting on queue depth anomalies.
**R (Result):** Eliminated message loss. System reliability improved measurably and the operations team gained visibility into queue health via dashboards for the first time.
**Reflection:** Messaging reliability is invisible until it fails. Observability — dead-letter monitoring, queue depth alerts — should be built in day one, not added after an incident.
**Best for questions about:** Debugging, production incidents, distributed systems, Azure Service Bus, reliability engineering, observability
