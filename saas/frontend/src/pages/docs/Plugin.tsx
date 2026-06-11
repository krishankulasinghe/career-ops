import { Layout } from '@/components/layout/Layout';
import { IconInfoCircle } from '@tabler/icons-react';

interface Skill {
  name: string;
  trigger: string;
  description: string;
}

const BUILT_IN_SKILLS: Skill[] = [
  { name: 'career-ops', trigger: '/career-ops', description: 'Main evaluation pipeline — evaluate a URL or run any mode' },
  { name: 'career-ops-scan', trigger: '/career-ops-scan', description: 'Portal scanner — hits Greenhouse/Ashby/Lever APIs without consuming AI tokens' },
  { name: 'career-ops-batch', trigger: '/career-ops-batch', description: 'Batch processor — evaluates all pending URLs in pipeline.md' },
  { name: 'career-ops-patterns', trigger: '/career-ops-patterns', description: 'Pattern analysis — surfaces rejection patterns and targeting gaps' },
  { name: 'career-ops-followup', trigger: '/career-ops-followup', description: 'Follow-up cadence calculator — tells you which applications need action today' },
];

export function PluginPage() {
  return (
    <Layout title="Plugins & Skills">
      <div className="row g-3">
        <div className="col-lg-9">

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="available-skills" className="docs-anchor mb-3">Available Skills</h2>
              <p>
                Career-Ops extends the{' '}
                <strong>Open Agent Skill Standard</strong> — a portable specification that lets AI
                coding assistants (Claude Code, Gemini CLI, Codex, OpenCode, Qwen, Copilot) invoke
                pre-packaged workflows called <em>skills</em>. Each skill is a <code>SKILL.md</code>{' '}
                file that tells the agent what the skill does, what inputs it needs, and how to
                invoke it.
              </p>
              <p>The following skills ship with Career-Ops:</p>

              <div className="table-responsive">
                <table className="table table-sm small mb-0">
                  <thead className="bg-200">
                    <tr>
                      <th>Skill</th>
                      <th>Trigger</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BUILT_IN_SKILLS.map((s) => (
                      <tr key={s.name}>
                        <td><code>{s.name}</code></td>
                        <td><code>{s.trigger}</code></td>
                        <td>{s.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="installing-plugins" className="docs-anchor mb-3">Installing Plugins</h2>
              <p>
                Skills are discovered by the AI coding assistant from the <code>.agents/skills/</code>{' '}
                directory. To install a community or third-party skill, copy its directory (containing
                a <code>SKILL.md</code>) into <code>.agents/skills/</code> and restart your AI CLI
                session.
              </p>

              <pre className="bg-100 rounded-2 p-3 small overflow-auto">
                <code>{`# Example: install a custom interview-coach skill
mkdir -p .agents/skills/interview-coach
cp /path/to/interview-coach/SKILL.md .agents/skills/interview-coach/

# Restart your AI CLI session to pick up the new skill
# Then invoke it with:
# /interview-coach`}</code>
              </pre>

              <div className="alert alert-info d-flex gap-2 mb-0 mt-3">
                <IconInfoCircle size={16} className="mt-1 flex-shrink-0" />
                <div>
                  Skills are plain Markdown files — they work across all AI CLI tools that
                  implement the Open Agent Skill Standard. A skill written for Claude Code will
                  also work with Gemini CLI, Codex, and OpenCode without modification.
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 id="writing-custom-skills" className="docs-anchor mb-3">Writing Custom Skills</h2>
              <p>
                A skill is a <code>SKILL.md</code> file that provides context, instructions,
                and examples for the AI agent. The format is deliberately simple — any Markdown
                file that clearly describes what the skill does, what inputs it expects, and what
                output it produces qualifies.
              </p>

              <p>Minimal <code>SKILL.md</code> structure:</p>
              <pre className="bg-100 rounded-2 p-3 small overflow-auto">
                <code>{`# My Custom Skill

## What This Skill Does
One paragraph describing the purpose of the skill.

## Inputs
- **Required:** <input 1> — description
- **Optional:** <input 2> — description

## Instructions
Step-by-step instructions the AI agent will follow when the skill is invoked.

## Example Invocation
User: /my-skill with input "..."
Agent: [does the work and returns output in this format]`}</code>
              </pre>

              <h5 className="mt-4">Career-Ops specific conventions</h5>
              <p>
                Skills that integrate with Career-Ops should follow the data contract described
                in <code>DATA_CONTRACT.md</code>:
              </p>
              <ul className="mb-0">
                <li>Write user data to <code>data/</code>, <code>output/</code>, or <code>reports/</code></li>
                <li>Read user profile from <code>config/profile.yml</code> and <code>modes/_profile.md</code></li>
                <li>Never modify system-layer files (<code>modes/_shared.md</code>, <code>*.mjs</code> scripts)</li>
                <li>Use canonical statuses from <code>templates/states.yml</code> when writing to the tracker</li>
              </ul>
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
                <a className="nav-link py-1 small" href="#available-skills">Available Skills</a>
                <a className="nav-link py-1 small" href="#installing-plugins">Installing Plugins</a>
                <a className="nav-link py-1 small" href="#writing-custom-skills">Writing Custom Skills</a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
