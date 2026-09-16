<script lang="ts">
  import { liveResults } from './liveResults.svelte.ts';
  import { historyStore } from './historyStore.svelte.ts';
  import { colors } from './model.ts';

  const transition = $derived(liveResults.mandateTransition);
  const rows = $derived.by(() => {
    if (!transition) return [];
    const before = new Map(transition.before.parties.map(party => [party.key, party]));
    const after = new Map(transition.after.parties.map(party => [party.key, party]));
    return [...new Set([...before.keys(), ...after.keys()])]
      .map(key => ({ key, before: before.get(key)?.seats || 0, after: after.get(key)?.seats || 0 }))
      .filter(row => row.before !== row.after)
      .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before) || a.key.localeCompare(b.key));
  });
  const maxSeats = $derived(Math.max(1, ...rows.flatMap(row => [row.before, row.after])));
  const gains = $derived(rows.filter(row => row.after > row.before).reduce((sum, row) => sum + row.after - row.before, 0));
  const losses = $derived(rows.filter(row => row.before < row.after).reduce((sum, row) => sum + row.before - row.after, 0));
</script>

{#if !historyStore.replayMode && rows.length}
  <section class="mandate-flow" aria-live="polite">
    <div class="flow-heading">
      <div>
        <h3>Senaste mandatflödet</h3>
        <p>Förändringen sedan föregående livehämtning · {gains} in · {losses} ut</p>
      </div>
      <span class="flow-key"><i></i> före → efter</span>
    </div>
    <div class="flow-list">
      {#each rows as row (`${row.key}-${liveResults.mandateVersion}`)}
        <div class="flow-row">
          <strong class="party-key" style:color={colors[row.key] || '#92958c'}>{row.key}</strong>
          <div class="flow-track" aria-label="{row.key}: {row.before} till {row.after} mandat">
            <span class="flow-bar before" style:width="{(row.before / maxSeats) * 100}%">{row.before}</span>
            <span class:gain={row.after > row.before} class:loss={row.after < row.before} class="flow-arrow" aria-hidden="true">→</span>
            <span class="flow-bar after" style:width="{(row.after / maxSeats) * 100}%">{row.after}</span>
          </div>
          <strong class:gain={row.after > row.before} class:loss={row.after < row.before} class="delta">
            {row.after > row.before ? '+' : ''}{row.after - row.before}
          </strong>
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .mandate-flow { margin: 0 0 18px; padding: 14px; border: 1px solid var(--line); background: var(--panel); }
  .flow-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  h3 { font-family: var(--font-display); font-size: 13px; letter-spacing: 1px; text-transform: uppercase; }
  p { margin: 3px 0 0; color: var(--muted); font-size: 11px; }
  .flow-key { color: var(--muted); font-size: 11px; white-space: nowrap; }
  .flow-key i { display: inline-block; width: 20px; height: 3px; margin-right: 5px; vertical-align: middle; background: var(--red-bright); }
  .flow-list { display: grid; gap: 7px; }
  .flow-row { display: grid; grid-template-columns: 30px 1fr 28px; align-items: center; gap: 10px; font-size: 12px; }
  .party-key { font-family: var(--font-display); }
  .flow-track { display: flex; align-items: center; gap: 5px; min-width: 0; }
  .flow-bar { display: flex; align-items: center; min-width: 22px; height: 18px; padding: 0 5px; color: #fff; font-family: var(--font-display); font-size: 11px; font-weight: 700; transition: width .5s ease; animation: flow-in .5s ease-out both; }
  .flow-bar.before { justify-content: flex-end; background: var(--muted); opacity: .6; }
  .flow-bar.after { background: var(--red); }
  .flow-arrow { color: var(--muted); font-size: 16px; line-height: 1; }
  .flow-arrow.gain, .gain { color: var(--green-up); }
  .flow-arrow.loss, .loss { color: var(--red-bright); }
  .delta { text-align: right; font-family: var(--font-display); }
  @keyframes flow-in { from { transform: scaleX(.2); transform-origin: left; opacity: .3; } to { transform: scaleX(1); opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .flow-bar { animation: none; transition: none; }
  }
  @media (max-width: 600px) {
    .flow-heading { align-items: flex-start; flex-direction: column; }
    .flow-row { grid-template-columns: 26px 1fr 24px; gap: 6px; }
  }
</style>
