import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AgentAction, useAgentPreference, type AgentActionResult } from '../src/index';
import '../src/styles.css';
import './showcase.css';

const preferenceKey = 'parcha.agent-action.showcase.v1';
const preference = { storageKey: preferenceKey, defaultValue: 'codex' };
const initialPrompt = 'Build a support agent that answers questions from our docs and escalates to Slack when it needs help.';

function Icon({ name }: { name: 'spark' | 'workflow' | 'data' | 'refresh' | 'check' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'spark' ? <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
      : name === 'workflow' ? <><rect x="3" y="3" width="6" height="6" rx="1.5" /><rect x="15" y="15" width="6" height="6" rx="1.5" /><path d="M6 9v6a3 3 0 0 0 3 3h6M9 6h6a3 3 0 0 1 3 3v6" /></>
      : name === 'data' ? <><path d="M4 20h16M6 16v-5M12 16V4M18 16V8" /></>
      : name === 'refresh' ? <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></>
      : <path d="m5 12 4 4L19 6" />}
  </svg>;
}

function Showcase() {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [copied, setCopied] = useState(false);
  const [playground, setPlayground] = useState(false);
  const { provider } = useAgentPreference(preference);
  const chosen = provider?.label ?? 'Choose an agent';
  const onResult = ({ status }: AgentActionResult) => {
    if (status === 'copied') {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3200);
    }
  };

  return <main className="showcase">
    <nav className="topbar" aria-label="Demo navigation">
      <a className="wordmark" href="https://github.com/Parcha-ai/agent-action"><span className="brand-symbol"><Icon name="spark" /></span>agent<span className="wordmark-muted">action</span><span className="by-parcha">by Parcha</span></a>
      <div className="topbar-right"><span className="react-tag">REACT COMPONENT</span><button className="reload" onClick={() => window.location.reload()} aria-label="Reload demo"><Icon name="refresh" />Reload demo</button></div>
    </nav>

    <header className="hero">
      <div className="eyebrow"><span />BRING YOUR OWN AGENT</div>
      <h1>Your product. <span>Their agent.</span></h1>
      <p>One familiar button. A choice that follows them everywhere.</p>
    </header>

    <section className="workspace" aria-label="Example product workspace">
      <div className="workspace-heading"><span className="workspace-title">YOUR WORKSPACE</span><span className="local-note"><span />Remembers your choice locally</span></div>
      <section className="build-card" aria-label="Build an agent">
        <div className="card-heading"><span className="feature-icon"><Icon name="spark" /></span><div><h2>Build an agent</h2><p>Start with an idea. Bring your own coding agent.</p></div></div>
        <label className="input-label" htmlFor="build-prompt">What do you want to build?</label>
        <textarea id="build-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} spellCheck={false} />
        <div className="build-footer"><span className="selected-agent">Using <strong data-current-agent>{chosen}</strong></span><AgentAction {...preference} label="Build an agent" prompt={prompt} onResult={onResult} actions={[{ id: 'playground', label: 'API playground', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16" /></svg>, onSelect: () => setPlayground(true) }]} /></div>
      </section>

      {playground && <section className="playground-panel" aria-label="API playground"><button onClick={() => setPlayground(false)}>Close</button><h2>API playground</h2><p>An extra menu action opens your product’s own experience.</p><pre>{JSON.stringify({ prompt }, null, 2)}</pre></section>}

      <div className="action-grid">
        <section className="action-card" aria-label="Run a workflow">
          <div className="card-heading"><span className="feature-icon small"><Icon name="workflow" /></span><div><h2>Run a workflow</h2><p>Take the next task into your agent.</p></div></div>
          <div className="card-footer"><span className="selected-agent">Using <strong data-current-agent>{chosen}</strong></span><AgentAction {...preference} label="Run workflow" prompt="Run the customer research workflow. Ask which company to research before running it." onResult={onResult} /></div>
        </section>
        <section className="action-card" aria-label="Explore your data">
          <div className="card-heading"><span className="feature-icon small"><Icon name="data" /></span><div><h2>Explore your data</h2><p>Same choice. Different starting point.</p></div></div>
          <div className="card-footer"><span className="selected-agent">Using <strong data-current-agent>{chosen}</strong></span><AgentAction {...preference} label="Query data" prompt="Help me analyze this week's workflow results. Ask what I want to learn, then use my configured product tools." onResult={onResult} /></div>
        </section>
      </div>
    </section>

    <footer className="page-footer"><code>@parcha/agent-action</code><span>Your product supplies the prompts, skills, MCP setup, and auth.</span></footer>
    <div className={`copy-toast${copied ? ' visible' : ''}`} role="status"><span><Icon name="check" /></span><div><strong>Prompt copied</strong><p>Ready to paste into {chosen}.</p></div></div>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Showcase />);
