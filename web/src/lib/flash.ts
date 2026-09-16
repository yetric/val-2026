// Svelte action: flashes an element when its displayed value changes, but only
// when that change is tied to genuinely new data (a live refresh or replay
// step), never a view-only re-render (sort/filter/area/comparison changes).
//
// `version` should be a reference that only changes identity when new data
// actually arrives (e.g. the live/replay snapshot object) — not on every
// render. We only flash when both the value AND the version changed since
// the last time this node was checked, so switching filters on the same
// snapshot never triggers a false flash.
export interface FlashParams {
  value: string | number | null | undefined;
  version: unknown;
}

export function flash(node: HTMLElement, params: FlashParams) {
  let lastValue = params.value;
  let lastVersion = params.version;
  return {
    update({ value: nextValue, version: nextVersion }: FlashParams) {
      if (nextVersion !== lastVersion && lastValue != null && nextValue != null && lastValue !== nextValue) {
        node.classList.remove('value-flash');
        void node.offsetWidth;
        node.classList.add('value-flash');
      }
      lastValue = nextValue;
      lastVersion = nextVersion;
    },
  };
}
