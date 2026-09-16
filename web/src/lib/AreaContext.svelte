<script lang="ts">
  import { filters } from './filters.svelte.ts';
  import { currentView } from './currentView.svelte.ts';
  import { areaMetrics } from './model.ts';

  const number = new Intl.NumberFormat('sv-SE');
  const sourceClock = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
  const area = $derived(currentView.area);
  const metrics = $derived(areaMetrics(area, Boolean(filters.area)));
  const areaType = $derived(
    !filters.area ? 'Hela riket' :
    /kommun/i.test(filters.area) ? 'Kommun' :
    /län/i.test(filters.area) ? 'Län' : 'Valkrets'
  );
  const sourceUpdate = $derived(area?.senasteUppdateringstid ? new Date(area.senasteUppdateringstid) : null);
  const sourceLabel = $derived(sourceUpdate && !Number.isNaN(sourceUpdate.getTime()) ? sourceClock.format(sourceUpdate) : '—');
  const progress = $derived(metrics.total && metrics.districts != null ? Math.min(100, metrics.districts / metrics.total * 100) : null);
</script>

<nav class="area-context" aria-label="Valt område">
  <div class="breadcrumbs">
    <button type="button" class:current={!filters.area} onclick={() => (filters.area = '')}>Hela riket</button>
    {#if filters.area}
      <span aria-hidden="true">›</span>
      <span class="current">{filters.area}</span>
    {/if}
  </div>
  {#if filters.area}
    <div class="area-detail">
      <div class="area-title">
        <span class="area-type">{areaType}</span>
        <strong>{filters.area}</strong>
      </div>
      {#if area}
        <div class="area-facts">
          <span>{metrics.districts == null ? '—' : number.format(metrics.districts)} / {metrics.total == null ? '—' : number.format(metrics.total)} valdistrikt</span>
          <span>{progress == null ? 'Progress saknas' : `${progress.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} % räknat`}</span>
          <span>Källan uppdaterad {sourceLabel}</span>
        </div>
      {:else}
        <span class="area-missing">Området saknas i den valda ögonblicksbilden.</span>
      {/if}
      <button type="button" class="reset" onclick={() => (filters.area = '')}>← Visa hela riket</button>
    </div>
  {/if}
</nav>

<style>
  .area-context { margin: -24px 0 44px; border-left: 3px solid var(--red); background: var(--panel); }
  .breadcrumbs { display: flex; align-items: center; gap: 7px; padding: 8px 14px; color: var(--muted); font-family: var(--font-display); font-size: 12px; }
  .breadcrumbs button { border: 0; padding: 0; background: none; color: var(--red-bright); cursor: pointer; font: inherit; text-decoration: underline; }
  .breadcrumbs .current { color: var(--text); }
  .area-detail { display: grid; grid-template-columns: minmax(150px, .7fr) 1fr auto; align-items: center; gap: 18px; padding: 12px 14px 14px; border-top: 1px solid var(--line-soft); }
  .area-title { display: flex; flex-direction: column; gap: 2px; }
  .area-type { color: var(--muted); font-family: var(--font-display); font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; }
  .area-title strong { font-family: var(--font-display); font-size: 17px; }
  .area-facts { display: flex; flex-wrap: wrap; gap: 6px 14px; color: var(--muted); font-size: 11px; }
  .area-missing { color: var(--red-bright); font-size: 11px; }
  .reset { border: 1px solid var(--line); background: transparent; color: var(--text); padding: 7px 9px; cursor: pointer; font-family: var(--font-display); font-size: 11px; white-space: nowrap; }
  .reset:hover { border-color: var(--red-bright); }
  @media (max-width: 700px) {
    .area-context { margin-top: -28px; }
    .area-detail { grid-template-columns: 1fr; gap: 10px; }
    .reset { justify-self: start; }
  }
</style>
