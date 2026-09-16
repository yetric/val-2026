<script lang="ts">
  import { regions } from './regions.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { currentView } from './currentView.svelte.ts';
  import { partiesFor, partyKey, partyName, colors, numeric } from './model.ts';
  import { flash } from './flash.ts';
  import type { ElectionData, Party } from './types.ts';

  const number = new Intl.NumberFormat('sv-SE');
  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (value: number | null | undefined) => (value == null ? '—' : `${decimal.format(value)} %`);
  const deltaText = (value: number | null | undefined) => (value == null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${decimal.format(Math.abs(value))}`);
  const fmt = (value: number | null | undefined) => (value == null ? '—' : number.format(value));

  let search = $state('');
  let sort = $state<'name' | 'share' | 'change' | 'votes'>('name');
  let regionParty = $state('');

  const availableParties = $derived(partiesFor(currentView.data));

  const rows = $derived.by(() => {
    const source = regions.entries.filter(e => e.data).map(e => e.data as ElectionData);
    const fallback = currentView.data?.valkretsar || [];
    const list = (source.length ? source : fallback)
      .filter(region => (region.namn || '').toLocaleLowerCase('sv-SE').includes(search.trim().toLocaleLowerCase('sv-SE')))
      .map(region => {
        const parties = partiesFor(region);
        const party = regionParty ? parties.find(p => partyKey(p) === regionParty) : [...parties].sort((a, b) => b.antalRoster - a.antalRoster)[0];
        return { region, party: (region.rosterPaverkaMandat?.antalRoster ?? 0) > 0 ? (party ?? null) : null };
      });
    list.sort((a, b) =>
      sort === 'share' ? (b.party?.andelRoster ?? -Infinity) - (a.party?.andelRoster ?? -Infinity)
      : sort === 'change' ? (b.party?.forandringAndelRoster ?? -Infinity) - (a.party?.forandringAndelRoster ?? -Infinity)
      : sort === 'votes' ? (b.region.rosterPaverkaMandat?.antalRoster || 0) - (a.region.rosterPaverkaMandat?.antalRoster || 0)
      : (a.region.namn || '').localeCompare(b.region.namn || '', 'sv')
    );
    return list;
  });
</script>

<section class="regions-section">
  <div class="section-top">
    <h2>Valkretsar</h2>
    <span class="subtle">{rows.length} valkretsar</span>
  </div>
  <div class="region-toolbar">
    <input type="search" placeholder="Sök valkrets" bind:value={search} />
    <select bind:value={regionParty}>
      <option value="">Största parti</option>
      {#each availableParties as p (partyKey(p))}
        <option value={partyKey(p)}>{partyName(p)}</option>
      {/each}
    </select>
    <select bind:value={sort}>
      <option value="name">Namn</option>
      <option value="share">Röstandel</option>
      <option value="change">Störst förändring</option>
      <option value="votes">Flest röster</option>
    </select>
  </div>
  <div class="region-grid">
    {#if !rows.length}
      <p class="empty-state">Inga valkretsar matchar din sökning.</p>
    {/if}
    {#each rows as { region, party } (region.namn)}
      {@const counted = numeric(region.antalValdistriktRaknade) ?? 0}
      {@const total = numeric(region.antalValdistriktSomSkaRaknas) ?? 0}
      {@const percent = total > 0 ? Math.min(100, (counted / total) * 100) : null}
      <button type="button" class="region-card" class:active={region.namn === filters.area} onclick={() => (filters.area = region.namn || '')}>
        <span class="region-name">{region.namn}</span>
        {#if party}
          <span class="region-result">
            <span class="mini-badge" style="--party-color: {colors[partyKey(party)] || '#92958c'}">{partyKey(party)}</span>
            <strong use:flash={{ value: pct(party.andelRoster), version: region }}>{pct(party.andelRoster)}</strong>
            <span class="change {(party.forandringAndelRoster || 0) >= 0 ? 'positive' : 'negative'}">{deltaText(party.forandringAndelRoster)} pp</span>
          </span>
        {:else}
          <span class="subtle">Inväntar röster</span>
        {/if}
        <span class="region-caption">{party ? `${partyName(party)} · ` : ''}{fmt(region.rosterPaverkaMandat?.antalRoster)} giltiga röster</span>
        {#if percent != null}
          <span class="region-progress" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin="0" aria-valuemax="100" title="{Math.round(percent)} % räknat · {counted} av {total} distrikt">
            <i style="width: {percent}%"></i>
          </span>
        {/if}
      </button>
    {/each}
  </div>
</section>

<style>
  .regions-section { background: #fff; border: 1px solid #e5e6df; border-radius: 10px; padding: 22px 24px; margin-bottom: 24px; }
  .section-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
  h2 { font-family: Manrope, sans-serif; font-size: 20px; font-weight: 650; margin: 0; }
  .subtle { font-size: 10px; color: #8b9085; }
  .empty-state { grid-column: 1 / -1; text-align: center; padding: 24px; color: #859275; font-size: 12px; }
  .region-toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
  input[type='search'], select { font-size: 12px; padding: 7px 9px; border: 1px solid #dedfd6; border-radius: 6px; }
  .region-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .region-card { text-align: left; border: 1px solid #e5e6df; border-radius: 8px; background: #fff; padding: 14px; cursor: pointer; font-family: inherit; color: inherit; display: flex; flex-direction: column; gap: 6px; }
  .region-card:hover { border-color: #b7c4a2; background: #fcfdf9; }
  .region-card.active { border-color: #d38a63; background: #fffaf4; }
  .region-name { font-size: 11px; font-weight: 550; }
  .region-result { display: flex; align-items: center; gap: 8px; }
  .region-result strong { font-size: 17px; }
  .mini-badge { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 4px; background: color-mix(in srgb, var(--party-color) 15%, white); color: var(--party-color); font-size: 8px; font-weight: 700; }
  .change { font-size: 9px; padding: 3px 5px; border-radius: 4px; }
  .change.positive { color: #507563; background: #edf4ed; }
  .change.negative { color: #b9665b; background: #fcf0ec; }
  .region-caption { font-size: 9px; color: #8f9983; }
  .region-progress { display: block; height: 4px; background: #edf0e8; border-radius: 3px; overflow: hidden; }
  .region-progress i { display: block; height: 100%; background: #829873; }
</style>
