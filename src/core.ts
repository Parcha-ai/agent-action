/** No React, DOM, storage access or side effects at import time. */
export interface AgentProvider {
  id: string;
  label: string;
  kind: 'app' | 'cli' | 'clipboard';
  /** Return a prompt-prefill link, or null to use the clipboard. Never include credentials. */
  getUrl?: (prompt: string) => string | null;
}

export const defaultProviders: readonly AgentProvider[] = Object.freeze([
  { id: 'codex', label: 'Codex app', kind: 'app', getUrl: (prompt: string) => `codex://new?prompt=${encodeURIComponent(prompt)}` },
  { id: 'codex-cli', label: 'Codex CLI', kind: 'cli' },
  { id: 'claude', label: 'Claude Code app', kind: 'app', getUrl: (prompt: string) => `claude://code/new?q=${encodeURIComponent(prompt)}` },
  { id: 'claude-cli', label: 'Claude Code CLI', kind: 'cli' },
  { id: 'cursor', label: 'Cursor', kind: 'app', getUrl: (prompt: string) => `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(prompt)}` },
  { id: 'other', label: 'Other / terminal', kind: 'clipboard' },
] satisfies AgentProvider[]);

export const DEFAULT_STORAGE_KEY = 'parcha.agent-action.preference.v1';
export const DEFAULT_MAX_URL_LENGTH = 8000;
export type Handoff =
  | { kind: 'link'; providerId: string; prompt: string; url: string }
  | { kind: 'copy'; providerId: string; prompt: string; reason: 'clipboard' | 'url-too-long' | 'invalid-url' };

const protocols = new Set(['https:', 'http:', 'codex:', 'claude:', 'cursor:', 'vscode:', 'vscode-insiders:']);
/** Relative product routes and known app schemes only; callbacks handle other integrations. */
export function isSafeActionUrl(url: string): boolean {
  if (!url || url !== url.trim() || /[\u0000-\u0020\u007f\\]/.test(url)) return false;
  if (/^[/?#]/.test(url) && !url.startsWith('//')) return true;
  try {
    const parsed = new URL(url);
    return protocols.has(parsed.protocol) && !parsed.username && !parsed.password;
  } catch { return false; }
}

/** Plans a handoff; never opens an app, executes a command, or sends a request. */
export function createHandoff(provider: AgentProvider, prompt: string, maxUrlLength = DEFAULT_MAX_URL_LENGTH): Handoff {
  if (!Number.isFinite(maxUrlLength) || maxUrlLength < 1) throw new RangeError('maxUrlLength must be a positive finite number');
  const copy = (reason: Extract<Handoff, { kind: 'copy' }>['reason']): Handoff => ({ kind: 'copy', providerId: provider.id, prompt, reason });
  if (!provider.getUrl) return copy('clipboard');
  let url: string | null;
  try { url = provider.getUrl(prompt); } catch { return copy('invalid-url'); }
  if (!url) return copy('clipboard');
  if (!isSafeActionUrl(url)) return copy('invalid-url');
  return url.length > maxUrlLength ? copy('url-too-long') : { kind: 'link', providerId: provider.id, prompt, url };
}

export interface PreferenceStore {
  getSnapshot(): string | null;
  getServerSnapshot(): null;
  subscribe(listener: () => void): () => void;
  set(providerId: string | null): void;
}
export interface PreferenceEnvironment {
  read(key: string): string | null;
  write(key: string, value: string | null): void;
  subscribe(listener: (key: string | null, value: string | null) => void): () => void;
}

/** The default browser environment is lazy; SSR importing or rendering never reads storage. */
export function createPreferenceStore(key = DEFAULT_STORAGE_KEY, environment?: PreferenceEnvironment): PreferenceStore {
  let value: string | null = null;
  let loaded = false;
  let memoryOnly = false;
  let stop: (() => void) | undefined;
  const listeners = new Set<() => void>();
  const env = () => environment ?? (typeof window === 'undefined' ? undefined : {
    read: (name: string) => window.localStorage.getItem(name),
    write: (name: string, next: string | null) => next === null ? window.localStorage.removeItem(name) : window.localStorage.setItem(name, next),
    subscribe: (listener: (name: string | null, next: string | null) => void) => {
      const handler = (event: StorageEvent) => {
        try { if (event.storageArea && event.storageArea !== window.localStorage) return; } catch { return; }
        listener(event.key, event.newValue);
      };
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    },
  });
  const notify = () => { for (const listener of listeners) listener(); };
  const load = () => {
    const source = env();
    if (!loaded && source) { try { value = source.read(key); } catch { /* Private mode: use memory. */ } loaded = true; }
  };
  return {
    getSnapshot: () => { load(); return value; },
    getServerSnapshot: () => null,
    subscribe: (listener) => {
      load(); listeners.add(listener);
      if (listeners.size === 1) {
        const source = env();
        // Resynchronize after an interval with no mounted widgets, unless persistence failed.
        if (source && !memoryOnly) { try { value = source.read(key); } catch { /* Keep memory. */ } }
        try { stop = source?.subscribe((name, next) => {
          if (name !== key && name !== null) return;
          value = name === null ? null : next; memoryOnly = false; notify();
        }); } catch { /* Same-tab preferences still work. */ }
      }
      return () => { listeners.delete(listener); if (!listeners.size) { stop?.(); stop = undefined; } };
    },
    set: (next) => {
      loaded = true; value = next;
      try { const source = env(); if (source) { source.write(key, next); memoryOnly = false; } else memoryOnly = true; }
      catch { memoryOnly = true; }
      notify();
    },
  };
}

const stores = new Map<string, PreferenceStore>();
/** All widgets with the same key share a preference, including when localStorage is blocked. */
export function getPreferenceStore(key = DEFAULT_STORAGE_KEY): PreferenceStore {
  let store = stores.get(key);
  if (!store) { store = createPreferenceStore(key); stores.set(key, store); }
  return store;
}
