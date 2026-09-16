import { analytics } from './analytics.svelte.ts';

export type WatchKind = 'area' | 'party';

export interface WatchItem {
  kind: WatchKind;
  key: string;
}

const STORAGE_KEY = 'val2026-watchlist';

function loadItems(): WatchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value)
      ? value.filter((item): item is WatchItem => (item?.kind === 'area' || item?.kind === 'party') && typeof item.key === 'string')
      : [];
  } catch {
    return [];
  }
}

function createWatchlist() {
  let items = $state<WatchItem[]>(loadItems());

  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* Storage may be unavailable. */ }
  }

  function isWatching(kind: WatchKind, key: string) {
    return items.some(item => item.kind === kind && item.key === key);
  }

  function toggle(kind: WatchKind, key: string) {
    items = isWatching(kind, key)
      ? items.filter(item => item.kind !== kind || item.key !== key)
      : [...items, { kind, key }];
    save();
    analytics.track('watchlist');
  }

  return {
    get items() { return items; },
    isWatching,
    toggle,
  };
}

export const watchlist = createWatchlist();
