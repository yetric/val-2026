<script lang="ts">
  import { onMount } from 'svelte';
  import { currentView } from './currentView.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { liveResults } from './liveResults.svelte.ts';
  import { trends } from './trends.svelte.ts';
  import { watchlist } from './watchlist.svelte.ts';
  import { partiesFor, partyKey, selectedArea } from './model.ts';

  const date = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
  let previousVisit = $state<number | null>(null);
  let copied = $state(false);

  onMount(() => {
    try { previousVisit = Number(localStorage.getItem('val2026-last-visit')) || null; localStorage.setItem('val2026-last-visit', String(Date.now())); } catch { previousVisit = null; }
  });

  const watchedAreas = $derived(watchlist.items.filter(item => item.kind === 'area'));
  const watchedParties = $derived(watchlist.items.filter(item => item.kind === 'party'));
  const unresolved = $derived(watchedAreas.filter(item => {
    const area = selectedArea(currentView.data, item.key);
    return !area || area.antalValdistriktRaknade < area.antalValdistriktSomSkaRaknas;
  }));
  const partyChanges = $derived.by(() => {
    const parties = partiesFor(currentView.area);
    const current = trends.points.at(-1)?.shares;
    const previous = trends.points.at(-2)?.shares;
    return parties.map(party => ({
      party,
      delta: current?.[partyKey(party)] != null && previous?.[partyKey(party)] != null ? current[partyKey(party)] - previous[partyKey(party)] : null,
    })).filter(item => watchedParties.some(watched => watched.key === partyKey(item.party)) && item.delta != null)
      .sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!));
  });
  const latestChange = $derived(liveResults.updateSummary);
  const briefing = $derived.by(() => {
    const lines = [`Val2026-briefing för ${filters.area || 'hela riket'}.`];
    if (previousVisit) lines.push(`Sedan ditt senaste besök (${date.format(previousVisit)}):`);
    if (watchedAreas.length) lines.push(unresolved.length ? `${unresolved.length} bevakat område återstår att räkna.` : 'Alla bevakade områden är färdigräknade.');
    if (partyChanges.length) lines.push(`Partirörelse: ${partyChanges.slice(0, 3).map(item => `${partyKey(item.party)} ${item.delta! > 0 ? '+' : ''}${item.delta!.toFixed(1)} procentenheter`).join(', ')}.`);
    if (latestChange?.parties.length) lines.push(`Senaste liveuppdateringen noterade ${latestChange.parties.map(party => `${party.key} ${party.delta > 0 ? '+' : ''}${party.delta.toFixed(1)} pp`).join(', ')}.`);
    if (!watchedAreas.length && !watchedParties.length) lines.push('Lägg till områden eller partier i Bevakning för en personlig sammanfattning.');
    return lines.join(' ');
  });

  function openArea(name: string) {
    filters.area = name;
    document.querySelector('#results-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(briefing);
      copied = true;
      setTimeout(() => { copied = false; }, 2500);
    } catch { copied = false; }
  }
</script>

<section class="briefing" aria-labelledby="briefing-title">
  <div class="briefing-top">
    <div>
      <span class="eyebrow">DIN ÖGONBLICKSBILD</span>
      <h2 id="briefing-title">Personlig briefing</h2>
    </div>
    <button type="button" onclick={copy}>{copied ? 'Kopierad' : 'Kopiera briefing'}</button>
  </div>
  <p class="summary">{briefing}</p>
  {#if watchedAreas.length}
    <div class="briefing-grid">
      {#each watchedAreas as item (item.key)}
        {@const area = selectedArea(currentView.data, item.key)}
        {@const done = area && area.antalValdistriktSomSkaRaknas > 0 && area.antalValdistriktRaknade >= area.antalValdistriktSomSkaRaknas}
        <button type="button" class:done onclick={() => openArea(item.key)}>
          <span>{item.key}</span><small>{done ? '✓ Färdigräknad' : area ? 'Pågår' : 'Saknas i ögonblicksbilden'}</small>
        </button>
      {/each}
    </div>
  {/if}
  <p class="evidence">Underlag: senaste livehämtning och sparade trendpunkter. Öppna ett bevakat område för att se siffrorna bakom sammanfattningen.</p>
</section>

<style>
  .briefing { margin: 0 0 44px; padding: 18px 20px; border: 1px solid var(--line); background: var(--panel); }
  .briefing-top { display: flex; justify-content: space-between; align-items: start; gap: 14px; }
  .eyebrow { color: var(--muted); font-family: var(--font-display); font-size: 10px; letter-spacing: 1.8px; }
  h2 { margin: 4px 0 0; font-size: 22px; }
  .briefing-top button { border: 1px solid var(--line); background: transparent; color: var(--text); padding: 7px 10px; cursor: pointer; font: inherit; font-size: 11px; }
  .briefing-top button:hover { border-color: var(--red-bright); }
  .summary { max-width: 900px; margin: 14px 0; color: var(--text); font-size: 13px; line-height: 1.6; }
  .briefing-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .briefing-grid button { display: flex; flex-direction: column; gap: 3px; border: 1px solid var(--line); background: #000; color: var(--text); padding: 8px 10px; cursor: pointer; text-align: left; }
  .briefing-grid button:hover { border-color: var(--red-bright); }
  .briefing-grid button.done { border-color: var(--green-up); }
  .briefing-grid small, .evidence { color: var(--muted); font-size: 10px; }
  .evidence { margin: 12px 0 0; }
</style>
