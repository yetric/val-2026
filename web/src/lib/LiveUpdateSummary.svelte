<script lang="ts">
  import { liveResults } from './liveResults.svelte.ts';
  import { historyStore } from './historyStore.svelte.ts';

  const number = new Intl.NumberFormat('sv-SE');
  const update = $derived(liveResults.updateSummary);
  const message = $derived.by(() => {
    if (!update || historyStore.replayMode) return '';
    const changes = [
      update.districts ? `${update.districts > 0 ? '+' : ''}${number.format(update.districts)} distrikt` : '',
      update.votes ? `${update.votes > 0 ? '+' : ''}${number.format(update.votes)} röster` : '',
      ...update.parties.map(party => `${party.key} ${party.delta > 0 ? '+' : ''}${party.delta.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pp`),
    ].filter(Boolean);
    return changes.length ? `Senaste liveuppdatering: ${changes.join(' · ')}` : 'Senaste liveuppdatering: inga mätbara förändringar.';
  });
</script>

{#if message}
  <p class="update-summary" role="status" aria-live="polite"><span aria-hidden="true">↻</span>{message}</p>
{/if}

<style>
  .update-summary { display: flex; align-items: center; gap: 7px; margin: -8px 0 20px; padding: 8px 10px; border-left: 2px solid var(--red-bright); background: var(--panel); color: var(--muted); font-family: var(--font-display); font-size: 11px; }
  .update-summary span { color: var(--red-bright); font-size: 14px; }
  @media (prefers-reduced-motion: reduce) { .update-summary span { color: var(--muted); } }
</style>
