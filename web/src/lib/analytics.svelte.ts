export type AnalyticsEvent = 'share' | 'export_csv' | 'export_json' | 'watchlist' | 'command_palette' | 'comparison';
type Counts = Partial<Record<AnalyticsEvent, number>>;

const STORAGE_KEY = 'val2026-local-analytics';
const defaults: Counts = {};

function load(): Counts {
  if (typeof localStorage === 'undefined') return { ...defaults };
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return value && typeof value === 'object' ? value : { ...defaults };
  } catch { return { ...defaults }; }
}

function createAnalytics() {
  let enabled = $state(typeof localStorage !== 'undefined' && localStorage.getItem(`${STORAGE_KEY}-enabled`) === 'true');
  let counts = $state<Counts>(load());

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(counts)); } catch { /* Storage may be unavailable. */ }
  }
  function track(event: AnalyticsEvent) {
    if (!enabled) return;
    counts = { ...counts, [event]: (counts[event] || 0) + 1 };
    persist();
  }
  function setEnabled(value: boolean) {
    enabled = value;
    if (!value) clear();
    try { localStorage.setItem(`${STORAGE_KEY}-enabled`, String(value)); } catch { /* Storage may be unavailable. */ }
  }
  function clear() {
    counts = {};
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
  }
  function exportJson() {
    return JSON.stringify({ version: 1, scope: 'local-only', collectedAt: new Date().toISOString(), counts }, null, 2);
  }

  return {
    get enabled() { return enabled; },
    get counts() { return counts; },
    track,
    setEnabled,
    clear,
    exportJson,
  };
}

export const analytics = createAnalytics();
