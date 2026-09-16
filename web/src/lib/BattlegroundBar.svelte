<script lang="ts">
  import { currentView } from './currentView.svelte.ts';
  import { partiesFor, partyKey, colors, blocks } from './model.ts';
  import type { Party } from './types.ts';

  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (value: number | null | undefined) => (value == null ? '—' : `${decimal.format(value)} %`);

  // Left-to-right political ordering for the bar, not alphabetical or by size.
  const POLITICAL_ORDER = ['V', 'MP', 'S', 'C', 'L', 'KD', 'M', 'SD'];
  const leftKeys = blocks[0].parties;
  const rightKeys = blocks[1].parties;

  const segments = $derived.by(() => {
    const parties = partiesFor(currentView.area);
    const byKey = new Map(parties.map(p => [partyKey(p), p]));
    const known = POLITICAL_ORDER.map(key => byKey.get(key)).filter((p): p is Party => p != null && (p.andelRoster ?? 0) > 0);
    const rest = parties.filter(p => !POLITICAL_ORDER.includes(partyKey(p)) && (p.andelRoster ?? 0) > 0);
    return [...known, ...rest];
  });

  const leftShare = $derived(segments.filter(p => leftKeys.includes(partyKey(p))).reduce((sum, p) => sum + (p.andelRoster || 0), 0));
  const rightShare = $derived(segments.filter(p => rightKeys.includes(partyKey(p))).reduce((sum, p) => sum + (p.andelRoster || 0), 0));
</script>

<div class="battleground">
  <div class="battleground-label">Röstandel per parti</div>
  {#if !segments.length}
    <p class="empty-state">Inväntar röster.</p>
  {:else}
    <div class="bar">
      {#each segments as p (partyKey(p))}
        <div class="segment" style="flex-basis: {p.andelRoster}%; background: {colors[partyKey(p)] || '#5c5f5a'};">
          {#if (p.andelRoster ?? 0) >= 4}
            <span style="font-size: {(p.andelRoster ?? 0) >= 15 ? 16 : 13}px;">{partyKey(p)}</span>
          {/if}
        </div>
      {/each}
      <div class="majority-tick" style="left: {leftShare}%;">
        <span>50&nbsp;%</span>
      </div>
    </div>
    <div class="bar-summary">
      <span><strong>VÄNSTER</strong> <span class="muted">{pct(leftShare)}</span></span>
      <span><strong>HÖGER</strong> <span class="muted">{pct(rightShare)}</span></span>
    </div>
  {/if}
</div>

<style>
  .battleground { margin-bottom: 32px; }
  .battleground-label { font-family: var(--font-display); font-size: 13px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
  .empty-state { color: var(--muted); font-size: 13px; }
  .bar { display: flex; width: 100%; height: 56px; position: relative; }
  .segment { display: flex; align-items: center; justify-content: center; border-right: 1px solid var(--bg); color: #fff; font-family: var(--font-display); font-weight: 700; transition: flex-basis 0.6s ease; overflow: hidden; }
  .segment:last-child { border-right: 0; }
  .majority-tick { position: absolute; top: -8px; bottom: -8px; width: 2px; background: var(--text); }
  .majority-tick span { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); font-family: var(--font-display); font-weight: 700; font-size: 12px; letter-spacing: 1px; white-space: nowrap; }
  .bar-summary { display: flex; justify-content: space-between; margin-top: 14px; font-family: var(--font-display); font-size: 15px; letter-spacing: 0.5px; }
  .bar-summary .muted { color: var(--muted); font-weight: 600; }
</style>
