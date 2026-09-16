import { liveResults } from './liveResults.svelte.ts';
import { historyStore } from './historyStore.svelte.ts';
import { filters } from './filters.svelte.ts';
import { selectedArea } from './model.ts';
import type { ElectionData } from './types.ts';

// The snapshot object currently on screen — live or a replay step. A fresh
// object arrives here exactly when genuinely new data does, which is what
// flash.ts uses to tell "new data" apart from "same data, different filter".
export const currentView = {
  get data(): ElectionData | null { return historyStore.replayMode ? historyStore.replayData : liveResults.data; },
  // The national snapshot narrowed to the selected valkrets, or itself when
  // no area is selected — mirrors legacy app.js's view().
  get area(): ElectionData | null { return selectedArea(this.data, filters.area); },
};
