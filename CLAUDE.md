@AGENTS.md
<!-- Add anything Claude Code specific that other agents don't need -->

## SaaS Transformation

This repo is being transformed into a commercial SaaS platform. The SaaS codebase lives in `saas/`.

- **SaaS agent instructions:** `saas/CLAUDE.md` — read this when working inside `saas/`
- **Full architecture plan:** `SAAS_TRANSFORMATION_PLAN.md`
- **Implementation prompts:** `TASKS.md`

When working on files in `saas/`, follow `saas/CLAUDE.md` conventions (Fastify, Drizzle, BullMQ, React, multi-tenancy rules). When working on the root CLI files (`*.mjs`, `modes/`, `data/`, etc.), follow `AGENTS.md` as usual.
