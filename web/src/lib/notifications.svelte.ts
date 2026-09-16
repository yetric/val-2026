import { audio } from './audio.svelte.ts';

export type NotificationType = 'completion' | 'mandate';

export interface NotificationItem {
  id: number;
  message: string;
}

export interface NotificationPreferences {
  completion: boolean;
  mandate: boolean;
  muted: boolean;
  browser: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = { completion: true, mandate: true, muted: false, browser: false };
const STORAGE_KEY = 'val2026-notification-preferences';

function loadPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES };
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      completion: value.completion !== false,
      mandate: value.mandate !== false,
      muted: value.muted === true,
      browser: value.browser === true,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function createNotifications() {
  let items = $state<NotificationItem[]>([]);
  let preferences = $state<NotificationPreferences>(loadPreferences());
  let nextId = 0;

  function dismiss(id: number) {
    items = items.filter(item => item.id !== id);
  }

  function setPreference(key: keyof NotificationPreferences, value: boolean) {
    preferences = { ...preferences, [key]: value };
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Storage may be unavailable. */ }
  }

  async function enableBrowserNotifications() {
    if (typeof Notification === 'undefined') return false;
    const permission = await Notification.requestPermission();
    setPreference('browser', permission === 'granted');
    return permission === 'granted';
  }

  function add(message: string, type: NotificationType) {
    if (preferences.muted || !preferences[type]) return;
    audio.play(type);
    if (preferences.browser && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
      new Notification('Val2026', { body: message, tag: `val2026-${type}` });
    }
    const id = nextId++;
    items = [...items, { id, message }];
    setTimeout(() => dismiss(id), 10000);
  }

  return {
    get items() { return items; },
    get preferences() { return preferences; },
    get browserSupported() { return typeof Notification !== 'undefined'; },
    get browserPermission() { return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission; },
    add,
    dismiss,
    setPreference,
    enableBrowserNotifications,
  };
}

export const notifications = createNotifications();
