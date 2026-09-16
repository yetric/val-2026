<script lang="ts">
  import { regions } from './regions.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import type { ElectionData } from './types.ts';

  const number = new Intl.NumberFormat('sv-SE');
  const fmt = (value: number | null | undefined) => (value == null ? '—' : number.format(value));

  function complete(list: ElectionData[]) {
    return list.filter(item => item.antalValdistriktSomSkaRaknas > 0 && item.antalValdistriktRaknade >= item.antalValdistriktSomSkaRaknas);
  }

  const okEntries = $derived(regions.entries.filter(e => e.data).map(e => e.data as ElectionData));
  const counties = $derived(complete(okEntries).sort((a, b) => (a.namn || '').localeCompare(b.namn || '', 'sv')));
  const municipalities = $derived(
    complete(okEntries.flatMap(region => region.valkretsar || []).filter(item => /kommun/i.test(item.namn || '')))
      .sort((a, b) => (a.namn || '').localeCompare(b.namn || '', 'sv'))
  );
  const readyCount = $derived(regions.entries.filter(e => e.ok).length);
</script>

<section class="completion-section">
  <div class="section-top">
    <h2>Vilka områden är färdigräknade?</h2>
    <span class="subtle">{counties.length} län · {municipalities.length} kommuner</span>
  </div>
  <p class="section-description">Områden där alla deras valdistrikt har rapporterat. Ett färdigräknat län eller kommun betyder inte att hela Sverige är färdigräknat.</p>
  <div class="completion-grid">
    <div>
      <h3>Län</h3>
      <div class="completion-list">
        {#if !counties.length}<p class="empty-state">Inga län är färdigräknade ännu.</p>{/if}
        {#each counties as item (item.namn)}
          <button type="button" class="completion-row" onclick={() => (filters.area = item.namn || '')}>
            <strong>{item.namn}</strong>
            <span>{fmt(item.antalValdistriktRaknade)} / {fmt(item.antalValdistriktSomSkaRaknas)} · {item.valdeltagande || '—'}</span>
          </button>
        {/each}
      </div>
    </div>
    <div>
      <h3>Kommuner</h3>
      <div class="completion-list">
        {#if !municipalities.length}<p class="empty-state">Inga kommuner är färdigräknade ännu.</p>{/if}
        {#each municipalities as item (item.namn)}
          <button type="button" class="completion-row" onclick={() => (filters.area = item.namn || '')}>
            <strong>{item.namn}</strong>
            <span>{fmt(item.antalValdistriktRaknade)} / {fmt(item.antalValdistriktSomSkaRaknas)} · {item.valdeltagande || '—'}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
  <p class="subtle">Progressen baseras på varje områdes egen nämnare. Uppdaterad från {readyCount} av {regions.entries.length || 29} länsflöden.</p>
</section>

<style>
  .completion-section { background: #fff; border: 1px solid #e5e6df; border-radius: 10px; padding: 22px 24px; margin-bottom: 24px; }
  .section-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  h2 { font-family: Manrope, sans-serif; font-size: 20px; font-weight: 650; margin: 0; }
  h3 { font-size: 12px; margin: 0 0 8px; }
  .subtle { font-size: 10px; color: #8b9085; }
  .section-description { font-size: 11px; color: #89937d; margin: 8px 0 16px; }
  .completion-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .completion-list { display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow-y: auto; }
  .empty-state { font-size: 11px; color: #859275; }
  .completion-row { display: flex; justify-content: space-between; gap: 10px; text-align: left; border: 0; background: #fafbf7; border-radius: 6px; padding: 8px 10px; font-size: 11px; cursor: pointer; font-family: inherit; color: inherit; }
  .completion-row:hover { background: #f1f5e9; }
  .completion-row span { color: #8b9085; }
</style>
