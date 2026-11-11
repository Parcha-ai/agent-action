import { describe, expect, it, vi } from 'vitest';
import {
  createHandoff, createPreferenceStore, defaultProviders, getPreferenceStore,
  isSafeActionUrl, type AgentProvider, type PreferenceEnvironment,
} from '../src/core';

const provider = (id: string) => defaultProviders.find((item) => item.id === id)!;
const customLink = (url: string): AgentProvider => ({ id: 'custom', label: 'Custom', kind: 'app', getUrl: () => url });

function fakeEnvironment(initial: string | null = null) {
  let stored = initial;
  let callback: ((key: string | null, next: string | null) => void) | undefined;
  const unsubscribe = vi.fn(() => { callback = undefined; });
  const environment: PreferenceEnvironment = {
    read: vi.fn(() => stored),
    write: vi.fn((_key, next) => { stored = next; }),
    subscribe: vi.fn((listener) => { callback = listener; return unsubscribe; }),
  };
  return {
    environment, unsubscribe,
    externalWrite(next: string | null) { stored = next; },
    broadcast(key: string | null, next: string | null) { callback?.(key, next); },
  };
}

describe('handoff planning', () => {
  it.each([
    ['codex', 'codex:', 'prompt'], ['claude', 'claude:', 'q'], ['cursor', 'cursor:', 'text'],
  ])('round-trips the complete Unicode prompt for %s', (id, protocol, parameter) => {
    const prompt = 'Build café research 👩🏽‍💻\nUse "quotes", & symbols, + # ? / and 日本語.';
    const handoff = createHandoff(provider(id), prompt);
    expect(handoff.kind).toBe('link');
    if (handoff.kind !== 'link') throw new Error('Expected link');
    const url = new URL(handoff.url);
    expect(url.protocol).toBe(protocol);
    expect(url.searchParams.get(parameter)).toBe(prompt);
    expect(handoff.prompt).toBe(prompt);
  });

  it.each(['codex-cli', 'claude-cli', 'other'])('copies for %s without an invented launcher', (id) => {
    expect(createHandoff(provider(id), 'Review this project')).toEqual({
      kind: 'copy', providerId: id, prompt: 'Review this project', reason: 'clipboard',
    });
  });

  it('falls back without truncating a long prompt', () => {
    const prompt = '🧠'.repeat(4000);
    expect(createHandoff(provider('codex'), prompt)).toEqual({
      kind: 'copy', providerId: 'codex', prompt, reason: 'url-too-long',
    });
  });

  it('applies the cap to the encoded URL, with an inclusive boundary', () => {
    const link = 'https://example.test/?prompt=%F0%9F%A7%A0';
    expect(createHandoff(customLink(link), '🧠', link.length).kind).toBe('link');
    expect(createHandoff(customLink(link), '🧠', link.length - 1)).toMatchObject({ kind: 'copy', reason: 'url-too-long' });
  });

  it.each([0, -1, Infinity, NaN])('rejects an invalid URL cap %s', (limit) => {
    expect(() => createHandoff(provider('codex'), 'test', limit)).toThrow(RangeError);
  });

  it.each([
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,test', 'file:///etc/passwd',
    'vbscript:msgbox(1)', ' javascript:alert(1)', 'https://example.test/ bad',
    'https://user:password@example.test/', '//example.test/route', '\\example.test',
    'java\nscript:alert(1)', 'https:\\evil.test', 'unknown-protocol:run',
  ])('rejects unsafe navigation %s and preserves the copy fallback', (url) => {
    expect(isSafeActionUrl(url)).toBe(false);
    expect(createHandoff(customLink(url), 'Original prompt')).toMatchObject({ kind: 'copy', reason: 'invalid-url', prompt: 'Original prompt' });
  });

  it.each(['/api?resource=runs', '#playground', '?tab=api', 'https://example.test/api', 'http://localhost:7340/api', 'vscode://publisher.extension/open'])('accepts a supported product or app URL %s', (url) => {
    expect(isSafeActionUrl(url)).toBe(true);
  });

  it('handles an unavailable or throwing adapter without losing the original prompt', () => {
    expect(createHandoff({ ...provider('codex'), getUrl: () => null }, 'original')).toMatchObject({ kind: 'copy', reason: 'clipboard', prompt: 'original' });
    expect(createHandoff({ ...provider('codex'), getUrl: () => { throw new Error('Unavailable'); } }, 'original')).toMatchObject({ kind: 'copy', reason: 'invalid-url', prompt: 'original' });
    expect(createHandoff(provider('codex'), 'Unpaired surrogate: \ud800')).toMatchObject({ kind: 'copy', prompt: 'Unpaired surrogate: \ud800' });
  });
});

describe('preference store', () => {
  it('does not access an environment until a client snapshot or subscription is requested', () => {
    const { environment } = fakeEnvironment('codex');
    const store = createPreferenceStore('my-product', environment);
    expect(store.getServerSnapshot()).toBeNull();
    expect(environment.read).not.toHaveBeenCalled();
    expect(environment.subscribe).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe('codex');
    expect(environment.read).toHaveBeenCalledWith('my-product');
  });

  it('shares one browser subscription between listeners and cleans up the final one', () => {
    const { environment, unsubscribe } = fakeEnvironment();
    const store = createPreferenceStore('preferences', environment);
    const first = vi.fn(); const second = vi.fn();
    const stopFirst = store.subscribe(first); const stopSecond = store.subscribe(second);
    store.set('claude-cli');
    expect(first).toHaveBeenCalledOnce(); expect(second).toHaveBeenCalledOnce();
    expect(environment.write).toHaveBeenCalledWith('preferences', 'claude-cli');
    expect(environment.subscribe).toHaveBeenCalledOnce();
    stopFirst(); expect(unsubscribe).not.toHaveBeenCalled();
    stopSecond(); expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('keeps a choice in memory across remounts when storage is blocked', () => {
    const { environment } = fakeEnvironment('old');
    environment.read = vi.fn(() => { throw new Error('Denied'); });
    environment.write = vi.fn(() => { throw new Error('Denied'); });
    const store = createPreferenceStore('blocked', environment);
    const stop = store.subscribe(vi.fn());
    store.set('claude'); stop();
    const stopAgain = store.subscribe(vi.fn());
    expect(store.getSnapshot()).toBe('claude');
    stopAgain();
  });

  it('syncs another tab only for its own key and supports clearing preferences', () => {
    const { environment, broadcast } = fakeEnvironment('codex');
    const store = createPreferenceStore('product-one', environment);
    const listener = vi.fn(); const stop = store.subscribe(listener);
    broadcast('product-two', 'other');
    expect(store.getSnapshot()).toBe('codex'); expect(listener).not.toHaveBeenCalled();
    broadcast('product-one', 'claude');
    expect(store.getSnapshot()).toBe('claude');
    broadcast(null, null);
    expect(store.getSnapshot()).toBeNull();
    store.set(null);
    expect(environment.write).toHaveBeenCalledWith('product-one', null);
    stop();
  });

  it('resynchronizes changes made while no widgets were mounted', () => {
    const { environment, externalWrite } = fakeEnvironment('codex');
    const store = createPreferenceStore('preferences', environment);
    const stop = store.subscribe(vi.fn()); stop();
    externalWrite('cursor');
    const stopAgain = store.subscribe(vi.fn());
    expect(store.getSnapshot()).toBe('cursor');
    stopAgain();
  });

  it('does not leak choices between product keys, while sharing stores for the same key', () => {
    const first = getPreferenceStore('test.product-one');
    const second = getPreferenceStore('test.product-two');
    first.set('codex-cli');
    expect(getPreferenceStore('test.product-one')).toBe(first);
    expect(second.getSnapshot()).toBeNull();
    first.set(null);
  });

  it('still updates subscribers when the environment cannot subscribe', () => {
    const { environment } = fakeEnvironment();
    environment.subscribe = () => { throw new Error('Unavailable'); };
    const store = createPreferenceStore('preferences', environment);
    const listener = vi.fn(); const stop = store.subscribe(listener);
    store.set('other');
    expect(store.getSnapshot()).toBe('other'); expect(listener).toHaveBeenCalledOnce();
    stop();
  });
});
