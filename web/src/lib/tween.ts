// Svelte action: counts a number up/down between its old and new value instead
// of snapping, then flashes (reusing the same .value-flash effect as flash.ts).
// Only animates when `version` changes too, for the same reason as flash.ts —
// a view-only re-render must never trigger a count, only genuinely new data.
//
// The element must own its text fully: don't also bind {value} as a Svelte
// child, or Svelte's own re-render will stomp the mid-animation frame.
export interface TweenParams {
  value: number | null;
  format: (value: number | null) => string;
  version: unknown;
  duration?: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function tween(node: HTMLElement, initial: TweenParams) {
  let lastValue = initial.value;
  let lastVersion = initial.version;
  let frame = 0;

  const paint = (value: number | null, format: TweenParams['format']) => { node.textContent = format(value); };
  paint(initial.value, initial.format);

  function flash() {
    node.classList.remove('value-flash');
    void node.offsetWidth;
    node.classList.add('value-flash');
  }

  function run(from: number, to: number, format: TweenParams['format'], duration: number) {
    cancelAnimationFrame(frame);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      paint(from + (to - from) * easeOutCubic(t), format);
      if (t < 1) frame = requestAnimationFrame(step);
      else flash();
    };
    frame = requestAnimationFrame(step);
  }

  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    update(next: TweenParams) {
      const { value, format, version, duration = 700 } = next;
      const previous = lastValue;
      const changed = version !== lastVersion && previous != null && value != null && previous !== value;
      if (changed && !reduceMotion) run(previous as number, value as number, format, duration);
      else { paint(value, format); if (changed) flash(); }
      lastValue = value;
      lastVersion = version;
    },
    destroy() { cancelAnimationFrame(frame); },
  };
}
