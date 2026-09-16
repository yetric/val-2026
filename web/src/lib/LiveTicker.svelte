<script lang="ts">
  import { trends } from './trends.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { milestones, eventTitle } from './story.ts';

  const clock = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' });

  const items = $derived(
    milestones(trends.points, { regional: Boolean(filters.area) })
      .slice(-14)
      .reverse()
      .map(event => `${clock.format(event.point.capturedAt)} · ${eventTitle(event)}`)
  );
  const text = $derived(items.length ? items.join('     •     ') : 'Inväntar de första sparade resultaten …');
</script>

<div class="live-ticker" aria-hidden="true">
  <span class="ticker-tag">Senaste</span>
  <div class="ticker-track">
    <div class="ticker-content">
      <span>{text}</span>
      <span>{text}</span>
    </div>
  </div>
</div>

<style>
  .live-ticker { display: flex; align-items: stretch; height: 38px; background: #000; border-top: 1px solid var(--line); overflow: hidden; }
  .ticker-tag { flex-shrink: 0; display: flex; align-items: center; background: var(--red); color: #fff; font-family: var(--font-display); font-weight: 700; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; padding: 0 14px; }
  .ticker-track { flex: 1; overflow: hidden; position: relative; display: flex; align-items: center; }
  .ticker-content { display: inline-flex; white-space: nowrap; animation: ticker-scroll 38s linear infinite; }
  .ticker-content span { flex-shrink: 0; padding-right: 90px; font-family: var(--font-display); font-size: 13px; letter-spacing: 0.3px; color: var(--text); }
  @keyframes ticker-scroll {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .ticker-content { animation: none; }
    .ticker-track { overflow-x: auto; }
  }
</style>
