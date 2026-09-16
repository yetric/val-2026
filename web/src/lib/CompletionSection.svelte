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
  .completion-section { margin-bottom: 32px; }
  .section-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  h2 { font-size: 22px; font-weight: 700; letter-spacing: 0.3px; }
  h3 { font-family: var(--font-display); font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--muted); margin: 0 0 8px; }
  .subtle { font-size: 11px; color: var(--muted); }
  .section-description { font-size: 12px; color: var(--muted); margin: 8px 0 16px; }
  .completion-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .completion-list { display: flex; flex-direction: column; gap: 1px; max-height: 220px; overflow-y: auto; }
  .empty-state { font-size: 12px; color: var(--muted); }
  .completion-row { display: flex; justify-content: space-between; gap: 10px; text-align: left; border: 0; background: var(--line-soft); padding: 8px 10px; font-size: 12px; cursor: pointer; font-family: inherit; color: inherit; }
  .completion-row:hover { background: var(--line); }
  .completion-row span { color: var(--muted); }
</style>
