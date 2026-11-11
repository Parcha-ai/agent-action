import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { createPreferenceStore, defaultProviders, DEFAULT_STORAGE_KEY, getPreferenceStore, type AgentProvider } from './core';

export interface AgentPreferenceOptions {
  providers?: readonly AgentProvider[];
  /** Supplying value makes selection controlled and disables persistence writes. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** null keeps the preference in this mounted hook only. */
  storageKey?: string | null;
}

/** A hydration-safe preference shared by widgets with the same storage key. */
export function useAgentPreference({ providers = defaultProviders, value, defaultValue = null, onValueChange, storageKey = DEFAULT_STORAGE_KEY }: AgentPreferenceOptions = {}) {
  const store = useMemo(() => {
    if (storageKey !== null) return getPreferenceStore(storageKey);
    let local: string | null = null;
    return createPreferenceStore('local', { read: () => local, write: (_key, next) => { local = next; }, subscribe: () => () => {} });
  }, [storageKey]);
  const stored = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const candidate = value !== undefined ? value : stored ?? defaultValue;
  const provider = providers.find((item) => item.id === candidate) ?? null;
  const setValue = useCallback((next: string | null) => {
    if (next !== null && !providers.some((item) => item.id === next)) return;
    if (value === undefined) store.set(next);
    onValueChange?.(next);
  }, [providers, value, store, onValueChange]);
  return { value: provider?.id ?? null, provider, setValue };
}
