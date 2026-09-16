<script lang="ts">
  import { currentView } from './currentView.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { historyStore } from './historyStore.svelte.ts';
  import { liveResults } from './liveResults.svelte.ts';

  const sourceUrl = 'https://resultat.val.se/data/resultat/val2026/RD_P.json';
  const date = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium', timeStyle: 'medium' });
  const sourceUpdate = $derived(currentView.data?.senasteUppdateringstid ? new Date(currentView.data.senasteUppdateringstid) : null);
  const sourceLabel = $derived(sourceUpdate && !Number.isNaN(sourceUpdate.getTime()) ? date.format(sourceUpdate) : 'Saknas i källan');
  const fetchedLabel = $derived(liveResults.fetchedAt == null ? 'Inte hämtad ännu' : date.format(liveResults.fetchedAt));
  const stateLabel = $derived(
    historyStore.replayMode ? 'Replay · sparad ögonblicksbild' :
    liveResults.stale ? 'Live · visar senast sparade data' :
    liveResults.error ? 'Live · senaste hämtning misslyckades' : 'Live · hämtad utan fel'
  );
  const correction = $derived([currentView.data?.meddelandetext, currentView.area?.meddelandetextValomrade].filter(Boolean).join(' ') || 'Inga korrigeringsmeddelanden i den här ögonblicksbilden.');
</script>

<details class="provenance">
  <summary>ⓘ Så produceras siffrorna <span>{stateLabel}</span></summary>
  <div class="provenance-panel">
    <dl>
      <div><dt>Område</dt><dd>{filters.area || 'Hela riket'}</dd></div>
      <div><dt>Datakälla</dt><dd><a href={sourceUrl} target="_blank" rel="noopener">Valmyndigheten ↗</a></dd></div>
      <div><dt>Källans uppdatering</dt><dd>{sourceLabel}</dd></div>
      <div><dt>Hämtad av Val2026</dt><dd>{historyStore.replayMode ? 'Sparad i arkivet' : fetchedLabel}</dd></div>
      <div><dt>Arkiverade ögonblicksbilder</dt><dd>{historyStore.entries.length ? `${historyStore.entries.length} sparade` : 'Inga tillgängliga'}</dd></div>
    </dl>
    <p class:warning={liveResults.stale || Boolean(liveResults.error)}>{stateLabel}. {correction}</p>
    <p class="method">Röstandelar visas från källans rapporterade resultat. Mandat med etiketten “beräknad” är Val2026s uppskattning och inte ett officiellt besked.</p>
    {#if historyStore.error}<p class="warning">{historyStore.error}</p>{/if}
  </div>
</details>

<style>
  .provenance { margin: 0 0 44px; border: 1px solid var(--line); background: var(--panel); }
  summary { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; padding: 11px 14px; color: var(--text); cursor: pointer; font-family: var(--font-display); font-size: 12px; letter-spacing: .4px; list-style: none; }
  summary::-webkit-details-marker { display: none; }
  summary:focus-visible { outline: 2px solid var(--red-bright); outline-offset: -2px; }
  summary span { color: var(--muted); font-size: 11px; font-weight: 400; }
  .provenance-panel { display: grid; grid-template-columns: minmax(0, 1.2fr) 1fr; gap: 16px 24px; padding: 14px; border-top: 1px solid var(--line-soft); }
  dl { margin: 0; }
  dl div { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; border-bottom: 1px solid var(--line-soft); font-size: 11px; }
  dt { color: var(--muted); } dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
  a { color: var(--red-bright); }
  p { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
  .method { grid-column: 1 / -1; padding-top: 10px; border-top: 1px solid var(--line-soft); }
  .warning { color: var(--red-bright); }
  @media (max-width: 700px) {
    .provenance-panel { grid-template-columns: 1fr; }
    .method { grid-column: auto; }
  }
</style>
