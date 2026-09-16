<script lang="ts">
  import { partyKey, partiesFor } from './model.ts';
  import { geography } from './geography.svelte.ts';
  import type { DistrictSummary, ElectionData } from './types.ts';

  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const number = new Intl.NumberFormat('sv-SE');
  const pct = (value: number | null | undefined) => (value == null ? '—' : `${decimal.format(value)} %`);
  const fmt = (value: number | null | undefined) => (value == null ? '—' : number.format(value));
  const deltaText = (value: number | null | undefined) => (value == null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${decimal.format(Math.abs(value))}`);

  let query = $state('');
  let regionFilter = $state('');
  let results = $state<DistrictSummary[]>([]);
  let total = $state(0);
  let searched = $state(false);
  let selected = $state<DistrictSummary | null>(null);
  let detail = $state<ElectionData | null>(null);
  let detailError = $state(false);
  let detailLoading = $state(false);
  let searchTimer: ReturnType<typeof setTimeout>;

  async function search() {
    if (query.trim().length < 2 && !regionFilter) { results = []; total = 0; searched = false; return; }
    searched = true;
    const response = await fetch(`/api/districts?q=${encodeURIComponent(query.trim())}&region=${encodeURIComponent(regionFilter)}`);
    const payload = await response.json();
    results = payload.results; total = payload.total;
  }

  function onQueryInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(search, 220);
  }

  async function loadDistrict(item: DistrictSummary) {
    selected = item; detail = null; detailError = false; detailLoading = true;
    try {
      const response = await fetch(`/api/districts/${item.code}`);
      if (!response.ok) throw new Error('District unavailable');
      const result = await response.json();
      detail = result.data;
    } catch {
      detailError = true;
    } finally {
      detailLoading = false;
    }
  }

  const topParties = $derived(detail ? [...partiesFor(detail)].sort((a, b) => b.antalRoster - a.antalRoster).slice(0, 5) : []);
</script>

<section class="district-finder" id="district-finder">
  <div class="section-top">
    <div><div class="eyebrow">HITTA ETT VALDISTRIKT</div><h2>Sök valdistrikt</h2></div>
    <span class="subtle">{!searched ? 'Sök i namn, kommun eller län' : `${total} träffar${total === 80 ? ' · visa de första 80' : ''}`}</span>
  </div>
  <div class="finder-controls">
    <input type="search" placeholder="Till exempel Gustavstorp, Karlshamn eller Blekinge" bind:value={query} oninput={onQueryInput} autocomplete="off" />
    <select bind:value={regionFilter} onchange={search}>
      <option value="">Alla län</option>
      {#each geography.regions as region (region.code)}<option value={region.name}>{region.name}</option>{/each}
    </select>
  </div>
  <div class="district-results">
    {#if !searched}
      <p class="empty-state">Börja skriva för att hitta ett valdistrikt.</p>
    {:else if !results.length}
      <p class="empty-state">Inga valdistrikt matchade din sökning.</p>
    {:else}
      {#each results as item (item.code)}
        <button type="button" class="district-result" class:active={selected?.code === item.code} onclick={() => loadDistrict(item)}>
          <strong>{item.name}</strong>
          <span>{item.municipality} · {item.region}</span>
        </button>
      {/each}
    {/if}
  </div>
  {#if selected}
    <div class="district-detail">
      {#if detailLoading}
        <p class="subtle">Hämtar senaste distriktsresultat…</p>
      {:else if detailError}
        <p class="error">Distriktsresultatet kunde inte hämtas just nu.</p>
      {:else if detail}
        <div class="district-detail-heading">{detail.namn} · {selected.municipality}</div>
        <p class="subtle">{detail.antalValdistriktRaknade} av {detail.antalValdistriktSomSkaRaknas} distrikt · {detail.valdeltagande || 'valdeltagande saknas'} · källa uppdaterad {detail.senasteUppdateringstid || '—'}</p>
        <div class="district-party-list">
          {#each topParties as p (partyKey(p))}
            <div>
              <strong>{partyKey(p)}</strong>
              <span>{pct(p.andelRoster)}</span>
              <small>{fmt(p.antalRoster)} röster · {p.forandringAndelRoster == null ? 'jämförelse saknas' : `${deltaText(p.forandringAndelRoster)} pp mot 2022`}</small>
            </div>
          {/each}
        </div>
        <a class="district-source" href="https://resultat.val.se/val2026/RD/{selected.regionCode}/{selected.municipalityCode}/{selected.code}?r=P" target="_blank" rel="noopener">Öppna originalresultatet ↗</a>
      {/if}
    </div>
  {/if}
</section>

<style>
  .district-finder { margin-bottom: 44px; }
  .section-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
  .eyebrow { font-family: var(--font-display); font-size: 12px; font-weight: 650; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); }
  h2 { font-size: 20px; font-weight: 700; letter-spacing: 0.3px; margin: 4px 0 0; }
  .subtle { font-size: 11px; color: var(--muted); }
  .empty-state { padding: 20px; text-align: center; color: var(--muted); font-size: 12px; }
  .error { color: var(--red-bright); font-size: 12px; }
  .finder-controls { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
  .finder-controls input { flex: 1; min-width: 220px; font-size: 12px; padding: 9px 11px; border: 1px solid var(--line); background: #000; color: var(--text); }
  .finder-controls select { font-size: 12px; padding: 9px 11px; border: 1px solid var(--line); background: #000; color: var(--text); }
  .district-results { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); max-height: 260px; overflow-y: auto; }
  .district-result { text-align: left; border: 0; background: var(--panel); padding: 10px 12px; cursor: pointer; font-family: inherit; color: inherit; display: flex; flex-direction: column; gap: 3px; }
  .district-result:hover { background: #1e1e22; }
  .district-result.active { box-shadow: inset 0 0 0 1px var(--red-bright); }
  .district-result strong { font-size: 12px; }
  .district-result span { font-size: 10px; color: var(--muted); }
  .district-detail { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
  .district-detail-heading { font-family: var(--font-display); font-size: 15px; font-weight: 700; }
  .district-party-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin: 10px 0; }
  .district-party-list > div { display: flex; align-items: baseline; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--line-soft); font-size: 12px; }
  .district-party-list strong { font-family: var(--font-display); width: 26px; }
  .district-party-list small { color: var(--muted); margin-left: auto; text-align: right; }
  .district-source { font-size: 11px; color: var(--red-bright); }
</style>
