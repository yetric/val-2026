<script lang="ts">
  import { onMount } from 'svelte';
  import { filters } from './filters.svelte.ts';
  import { regions } from './regions.svelte.ts';
  import { colors, partiesFor, partyKey, partyName, numeric } from './model.ts';
  import type { ElectionData } from './types.ts';

  const decimal = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
  const number = new Intl.NumberFormat('sv-SE');
  const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/å/gi, 'a').replace(/ä/gi, 'a').replace(/ö/gi, 'o').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  let mapSource = $state('');
  let mapError = $state(false);

  async function loadMap() {
    try {
      const response = await fetch('/valkretsar.svg');
      if (!response.ok) throw new Error('Map unavailable');
      mapSource = await response.text();
    } catch {
      mapError = true;
    }
  }

  onMount(() => {
    const section = document.querySelector('.results-map');
    if (!section || typeof IntersectionObserver === 'undefined') {
      loadMap();
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        loadMap();
      }
    }, { rootMargin: '600px' });
    observer.observe(section);
    return () => observer.disconnect();
  });

  function leader(data: ElectionData | null) {
    return data ? [...partiesFor(data)].sort((a, b) => b.antalRoster - a.antalRoster)[0] : null;
  }

  const cards = $derived(regions.entries.map(entry => {
    const data = entry.data;
    const counted = numeric(data?.antalValdistriktRaknade) ?? 0;
    const total = numeric(data?.antalValdistriktSomSkaRaknas) ?? 0;
    const percent = total > 0 ? Math.min(100, counted / total * 100) : null;
    const party = leader(data);
    return { ...entry, counted, total, percent, party, complete: total > 0 && counted >= total };
  }));
  const completeCount = $derived(cards.filter(card => card.complete).length);
  const readyCount = $derived(cards.filter(card => card.ok).length);
  const mapMarkup = $derived.by(() => {
    if (!mapSource) return '';
    let markup = mapSource;
    for (const card of cards) {
      const id = `valkrets-${slug(card.name)}`;
      const color = card.party ? colors[partyKey(card.party)] || '#92958c' : '#2a2a2e';
      const accessibleName = card.name.replaceAll('"', '&quot;');
      const attributes = ` data-map-code="${card.code}" data-map-name="${accessibleName}" aria-label="${accessibleName}" data-complete="${card.complete}" tabindex="0" role="button" style="fill:${color}"`;
      markup = markup.replace(`id="${id}"`, `id="${id}"${attributes}`);
    }
    return markup;
  });

  function selectMap(event: Event) {
    if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
    if (event instanceof KeyboardEvent) event.preventDefault();
    const target = (event.target as Element).closest<SVGPathElement>('[data-map-code]');
    const code = target?.dataset.mapCode;
    const area = cards.find(card => card.code === code);
    if (area) filters.area = area.name;
  }
</script>

<section class="results-map" aria-labelledby="results-map-title">
  <div class="section-top">
    <div>
      <div class="eyebrow">VALKRETSAR</div>
      <h2 id="results-map-title">Sverige just nu</h2>
    </div>
    <span class="subtle">{completeCount} färdigräknade · {readyCount} av {cards.length || 29} flöden</span>
  </div>
  <p class="description">Klicka på en valkrets för att visa dess resultat. Färg visar största parti; grön kant betyder att alla distrikt är räknade.</p>
  <div class="legend" aria-label="Kartförklaring">
    {#each Object.entries(colors).slice(0, 8) as [key, color] (key)}<span><i style:background={color}></i>{key}</span>{/each}
    <span><i class="complete-legend"></i> Färdigräknad</span>
  </div>
  {#if mapError}
    <p class="map-error">Kartan kunde inte hämtas. Använd områdeslistan nedan.</p>
  {:else if !mapMarkup}
    <p class="map-loading">Hämtar kartan…</p>
  {:else}
    <!-- Delegates clicks and keyboard activation from the injected, focusable SVG paths. -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="map-canvas" role="group" aria-label="Interaktiv karta över valkretsar" onclick={selectMap} onkeydown={selectMap}>
      {@html mapMarkup}
    </div>
  {/if}
  <details class="map-list">
    <summary>Visa alla valkretsar som lista</summary>
    <div class="map-list-grid">
      {#each cards as card (card.code)}
        <button type="button" class:active={filters.area === card.name} onclick={() => (filters.area = card.name)}>
          <span><i style:background={card.party ? colors[partyKey(card.party)] || '#92958c' : '#2a2a2e'}></i>{card.name}</span>
          <small>{card.complete ? '✓ Klar' : `${decimal.format(card.percent || 0)} %`}</small>
        </button>
      {/each}
    </div>
  </details>
  <p class="attribution">Kartunderlag: <a href="https://sv.wikipedia.org/wiki/Fil:SWE-Map_Valkretsar.svg" target="_blank" rel="noopener">SWE-Map Valkretsar.svg</a> av Lokal_Profil · CC BY-SA 2.5.</p>
</section>

<style>
  .results-map { contain: layout paint; content-visibility: auto; contain-intrinsic-size: 650px; margin-bottom: 44px; padding: 24px; background: var(--panel); border: 1px solid var(--line); }
  .section-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .eyebrow { color: var(--muted); font-family: var(--font-display); font-size: 11px; font-weight: 650; letter-spacing: 2px; }
  h2 { margin: 4px 0 0; font-size: 22px; font-weight: 700; letter-spacing: .3px; }
  .subtle, .description, .attribution { color: var(--muted); font-size: 11px; }
  .description { margin: 0 0 12px; }
  .legend { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-bottom: 14px; color: var(--muted); font-family: var(--font-display); font-size: 10px; }
  .legend i, .map-list i { display: inline-block; width: 8px; height: 8px; margin-right: 5px; border-radius: 50%; vertical-align: 1px; }
  .legend .complete-legend { border: 2px solid var(--green-up); background: transparent; }
  .map-canvas { display: flex; justify-content: center; min-height: 420px; padding: 12px; background: #09090a; border: 1px solid var(--line); overflow: auto; }
  .map-canvas :global(svg) { width: min(100%, 420px); height: auto; }
  .map-canvas :global(path[data-map-code]) { cursor: pointer; stroke: var(--bg); stroke-width: .8; transition: filter .15s, stroke-width .15s; }
  .map-canvas :global(path[data-map-code]:hover), .map-canvas :global(path[data-map-code][data-map-code].active) { filter: brightness(1.35); stroke: var(--text); stroke-width: 1.5; }
  .map-canvas :global(path[data-complete='true']) { stroke: var(--green-up); stroke-width: 1.3; }
  .map-loading, .map-error { padding: 36px; color: var(--muted); text-align: center; }
  .map-error { color: var(--red-bright); }
  .map-list { margin-top: 12px; border-top: 1px solid var(--line); }
  .map-list summary { padding: 10px 0; color: var(--muted); cursor: pointer; font-family: var(--font-display); font-size: 12px; }
  .map-list-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); }
  .map-list-grid button { display: flex; justify-content: space-between; gap: 8px; border: 0; background: var(--bg); color: var(--text); padding: 9px 10px; cursor: pointer; text-align: left; font: inherit; font-size: 11px; }
  .map-list-grid button:hover, .map-list-grid button.active { background: #1e1e22; }
  .map-list-grid small { color: var(--muted); white-space: nowrap; }
  .attribution { margin: 12px 0 0; }
  .attribution a { color: var(--muted); }
  @media (max-width: 700px) {
    .results-map { padding: 16px; }
    .section-top { align-items: flex-start; flex-direction: column; }
    .map-canvas { min-height: 360px; }
    .map-list-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
