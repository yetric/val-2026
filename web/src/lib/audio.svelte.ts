export type AudioCue = 'completion' | 'mandate';

export interface AudioPreferences {
  enabled: boolean;
  volume: number;
  quietHours: boolean;
  reduced: boolean;
}

const STORAGE_KEY = 'val2026-audio-preferences';
const defaults: AudioPreferences = { enabled: false, volume: 0.35, quietHours: true, reduced: false };

function load(): AudioPreferences {
  if (typeof localStorage === 'undefined') return { ...defaults };
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      enabled: value.enabled === true,
      volume: typeof value.volume === 'number' ? Math.min(1, Math.max(0, value.volume)) : defaults.volume,
      quietHours: value.quietHours !== false,
      reduced: value.reduced === true,
    };
  } catch {
    return { ...defaults };
  }
}

function createAudio() {
  let preferences = $state<AudioPreferences>(load());
  let context: AudioContext | null = null;

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Storage may be unavailable. */ }
  }
  function setPreference<K extends keyof AudioPreferences>(key: K, value: AudioPreferences[K]) {
    preferences = { ...preferences, [key]: value };
    save();
  }
  function quietNow() {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 8;
  }
  function play(cue: AudioCue) {
    if (!preferences.enabled || preferences.reduced || (preferences.quietHours && quietNow()) || typeof AudioContext === 'undefined') return;
    context ||= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = cue === 'completion' ? 660 : 440;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, preferences.volume * 0.12), now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (preferences.reduced ? 0.08 : 0.18));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + (preferences.reduced ? 0.08 : 0.18));
    if (cue === 'completion' && !preferences.reduced) {
      const second = context.createOscillator();
      const secondGain = context.createGain();
      second.type = 'sine';
      second.frequency.value = 880;
      secondGain.gain.setValueAtTime(0.0001, now + 0.1);
      secondGain.gain.exponentialRampToValueAtTime(Math.max(0.001, preferences.volume * 0.1), now + 0.115);
      secondGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      second.connect(secondGain).connect(context.destination);
      second.start(now + 0.1);
      second.stop(now + 0.28);
    }
  }

  return {
    get preferences() { return preferences; },
    setPreference,
    play,
    get supported() { return typeof AudioContext !== 'undefined'; },
  };
}

export const audio = createAudio();
