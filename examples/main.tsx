import { useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { AgentAction } from '../src/index';
import '../src/styles.css';
import './page.css';

function Demo() {
  const [prompt, setPrompt] = useState('Build a support agent that answers questions from our docs and escalates to Slack when it needs help.');
  const [playground, setPlayground] = useState(false);
  return <main>
    <nav><a className="brand" href="#">agent<span>.action</span></a><span>BRING YOUR OWN AGENT</span><a href="https://github.com/Parcha-ai/agentrun">By Parcha ↗</a></nav>
    <header><p className="eyebrow">YOUR PRODUCT. THEIR AGENT.</p><h1>A familiar button.<br/>A new way to work.</h1><p>Let people use the coding agent they already love.</p></header>
    <section className="composer" aria-label="Build an agent">
      <label htmlFor="prompt">What do you want to build?</label>
      <textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} />
      <footer><span>One choice, remembered across every action.</span><AgentAction label="Build an agent" prompt={prompt} actions={[{ id: 'playground', label: 'API playground', onSelect: () => setPlayground(true) }]} /></footer>
    </section>
    {playground && <section className="playground"><button onClick={() => setPlayground(false)}>Close</button><h2>Your playground goes here</h2><p>The extra action calls your product’s own navigation callback.</p><pre>{prompt}</pre></section>}
    <div className="examples-grid">
      <section className="mini-card"><span className="tile-icon">↗</span><h2>Run a workflow</h2><p>Hand off a specific task with the right context.</p><AgentAction label="Run workflow" prompt="Run the customer research workflow. Ask which company to research before running it." /></section>
      <section className="mini-card"><span className="tile-icon">⌘</span><h2>Explore your data</h2><p>The same agent choice, wherever you work.</p><AgentAction label="Query data" prompt="Help me analyze this week's workflow results. Ask what I want to learn, then use my configured product tools." /></section>
      <section className="mini-card custom-theme"><span className="tile-icon">✳</span><h2>Make it your own</h2><p>Your colors, your prompts, your product.</p><AgentAction label="Use your agent" prompt="Help me get started with this product. Read its public documentation first." style={{ '--aa-background': '#c2efcb', '--aa-foreground': '#173421', '--aa-border': '#c2efcb', '--aa-hover': '#a8dfb5', '--aa-radius': '18px' } as CSSProperties} /></section>
    </div>
    <aside className="implementation"><code>npm install @parcha/agent-action</code><span>React · Optional styles · Custom providers</span><small>Local preview — npm publication pending.</small></aside>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Demo />);
