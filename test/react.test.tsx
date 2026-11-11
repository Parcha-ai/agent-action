import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AgentAction } from '../src/AgentAction';
import { useAgentPreference } from '../src/useAgentPreference';

beforeAll(() => {
  // Browser geometry/pointer APIs required by Radix, absent from jsdom.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
const prompt = 'Build an agent. Keep a & b separate.\nAsk about the missing inputs.';
let next = 0;
const key = () => `test-agent-action-${++next}`;
function clipboard(reject = false) {
  const write = reject ? vi.fn().mockRejectedValue(new Error('blocked')) : vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
  return write;
}
async function select(label: string, provider: string) {
  await userEvent.click(screen.getByRole('button', { name: `Choose coding agent for ${label}` }));
  await userEvent.click(screen.getByRole('menuitemradio', { name: provider }));
}

describe('AgentAction', () => {
  it('saves a choice without launching or copying, shares it between widgets and retains it on remount', async () => {
    const storageKey = key();
    const write = clipboard();
    const result = vi.fn();
    const view = render(<><AgentAction label="Build" prompt={prompt} storageKey={storageKey} onResult={result} /><AgentAction label="Query" prompt={prompt} storageKey={storageKey} /></>);
    await userEvent.click(screen.getByRole('button', { name: 'Build' }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Claude Code CLI' }));
    expect(write).not.toHaveBeenCalled();
    expect(result).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKey)).toBe('claude-cli');
    expect(screen.getByRole('button', { name: 'Query' }).getAttribute('title')).toBe('Copy prompt for Claude Code CLI');
    await userEvent.click(screen.getByRole('button', { name: 'Build' }));
    expect(write).toHaveBeenCalledWith(prompt);
    expect(result).toHaveBeenCalledWith({ status: 'copied', providerId: 'claude-cli' });
    view.unmount();
    render(<AgentAction prompt={prompt} storageKey={storageKey} />);
    expect(screen.getByRole('button', { name: 'Use your agent' }).getAttribute('title')).toBe('Copy prompt for Claude Code CLI');
  });

  it('emits a launch request for encoded app links without claiming that an application opened', () => {
    const result = vi.fn();
    render(<AgentAction prompt={prompt} value="codex" onResult={result} />);
    const link = screen.getByRole('link', { name: 'Use your agent' });
    expect(new URL(link.getAttribute('href')!).searchParams.get('prompt')).toBe(prompt);
    // Prevent navigation in this DOM-only test, without bypassing the React click handler.
    link.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(link);
    expect(result).toHaveBeenCalledExactlyOnceWith({ status: 'launch-requested', providerId: 'codex' });
    expect(document.querySelector('[download]')).toBeNull();
  });

  it('lets controlled consumers own selection and does not write their choice to storage', async () => {
    const storageKey = key();
    const change = vi.fn();
    render(<AgentAction label="Build" prompt={prompt} value="claude-cli" storageKey={storageKey} onValueChange={change} />);
    await select('Build', 'Codex CLI');
    expect(change).toHaveBeenCalledExactlyOnceWith('codex-cli');
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(screen.getByRole('button', { name: 'Build' }).getAttribute('title')).toBe('Copy prompt for Claude Code CLI');
  });

  it('provides a focused manual-copy dialog if the clipboard fails', async () => {
    clipboard(true);
    const result = vi.fn();
    render(<AgentAction prompt={prompt} defaultValue="codex-cli" storageKey={null} onResult={result} />);
    await userEvent.click(screen.getByRole('button', { name: 'Use your agent' }));
    const field = screen.getByRole('textbox', { name: 'Prompt to copy' }) as HTMLTextAreaElement;
    expect(field.value).toBe(prompt);
    expect(document.activeElement).toBe(field);
    expect(screen.getByRole('dialog', { name: 'Copy prompt' })).toBeTruthy();
    expect(result).toHaveBeenCalledExactlyOnceWith({ status: 'manual-copy', providerId: 'codex-cli' });
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Use your agent' }));
  });

  it('returns to the menu trigger after a failed copy from the menu', async () => {
    clipboard(true);
    render(<AgentAction prompt={prompt} storageKey={null} />);
    const trigger = screen.getByRole('button', { name: 'Choose coding agent for Use your agent' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Copy prompt' }));
    expect(screen.getByRole('dialog', { name: 'Copy prompt' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('uses keyboard navigation and restores focus when the menu is dismissed', async () => {
    render(<AgentAction prompt={prompt} storageKey={null} />);
    const trigger = screen.getByRole('button', { name: 'Choose coding agent for Use your agent' });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(document.activeElement?.textContent).toContain('Codex app'));
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: 'Use your agent' }).getAttribute('title')).toBe('Copy prompt for Codex CLI');
    expect(document.activeElement).toBe(trigger);
  });

  it('renders custom actions, rejects unsafe links and applies styling to portaled content', async () => {
    const action = vi.fn();
    render(<AgentAction prompt={prompt} storageKey={null} classNames={{ menu: 'my-menu', item: 'my-item' }} style={{ color: 'tomato' }} actions={[
      { id: 'playground', label: 'Playground', href: '/api' },
      { id: 'callback', label: 'Custom action', onSelect: action },
      { id: 'unsafe', label: 'Unsafe', href: 'javascript:alert(1)' },
    ]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose coding agent for Use your agent' }));
    expect(screen.getByRole('menu').className).toContain('my-menu');
    expect(screen.getByRole('menu').style.color).toBe('tomato');
    expect(screen.getByRole('menuitem', { name: 'Playground' }).getAttribute('href')).toBe('/api');
    expect(screen.getByRole('menuitem', { name: 'Unsafe' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('menuitem', { name: 'Unsafe' }).hasAttribute('href')).toBe(false);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Custom action' }));
    expect(action).toHaveBeenCalledExactlyOnceWith();
  });

  it('lets a custom handoff own launch behavior and reports rejection without running the fallback', async () => {
    const write = clipboard();
    const onHandoff = vi.fn().mockRejectedValue(new Error('failed'));
    const result = vi.fn();
    render(<AgentAction prompt={prompt} value="codex" onHandoff={onHandoff} onResult={result} />);
    expect(screen.queryByRole('link')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Use your agent' }));
    expect(onHandoff).toHaveBeenCalledWith(expect.objectContaining({ kind: 'link', providerId: 'codex', prompt }));
    expect(write).not.toHaveBeenCalled();
    expect(result).toHaveBeenCalledExactlyOnceWith({ status: 'error', providerId: 'codex' });
  });

  it.each(['prompt', 'provider', 'disabled'] as const)('ignores stale custom-handoff rejection after %s changes', async (changed) => {
    let reject!: (error: Error) => void;
    const onHandoff = vi.fn(() => new Promise<void>((_resolve, onReject) => { reject = onReject; }));
    const result = vi.fn();
    const view = render(<AgentAction prompt={prompt} value="codex" onHandoff={onHandoff} onResult={result} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use your agent' }));
    view.rerender(<AgentAction prompt={changed === 'prompt' ? 'A new request' : prompt} value={changed === 'provider' ? 'claude' : 'codex'} disabled={changed === 'disabled'} onHandoff={onHandoff} onResult={result} />);
    await act(async () => { reject(new Error('late failure')); });
    expect(result).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('hydrates without mismatches when a browser preference differs from the server snapshot', async () => {
    const storageKey = key();
    localStorage.setItem(storageKey, 'codex');
    const component = <AgentAction prompt={prompt} storageKey={storageKey} />;
    const html = renderToString(component);
    expect(html).not.toContain('codex://');
    const host = document.body.appendChild(document.createElement('div'));
    host.innerHTML = html;
    const error = vi.fn();
    let root: Root;
    await act(async () => { root = hydrateRoot(host, component, { onRecoverableError: error }); });
    expect(error).not.toHaveBeenCalled();
    expect(host.querySelector('a')?.getAttribute('href')).toContain('codex://');
    await act(async () => root.unmount());
    host.remove();
  });

  it('keeps nonpersistent widgets independent and performs no storage access', async () => {
    const read = vi.spyOn(Storage.prototype, 'getItem');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    render(<><AgentAction label="First" prompt={prompt} storageKey={null} /><AgentAction label="Second" prompt={prompt} storageKey={null} /></>);
    await select('First', 'Codex CLI');
    expect(screen.getByRole('button', { name: 'First' }).getAttribute('title')).toBe('Copy prompt for Codex CLI');
    expect(screen.getByRole('button', { name: 'Second' }).getAttribute('title')).toBe('Choose your coding agent');
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it('recovers from a removed remembered provider and supports the standalone hook', async () => {
    const storageKey = key();
    localStorage.setItem(storageKey, 'removed');
    function Headless() {
      const { provider, setValue } = useAgentPreference({ storageKey });
      return <button onClick={() => setValue('claude-cli')}>{provider?.label ?? 'Choose'}</button>;
    }
    render(<Headless />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose' }));
    expect(screen.getByRole('button', { name: 'Claude Code CLI' })).toBeTruthy();
    expect(localStorage.getItem(storageKey)).toBe('claude-cli');
  });
});
