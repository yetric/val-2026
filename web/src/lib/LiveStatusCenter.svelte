<script lang="ts">
  import { liveResults, REFRESH_INTERVAL_MS } from './liveResults.svelte.ts';
  import { regions } from './regions.svelte.ts';
  import { historyStore } from './historyStore.svelte.ts';

  const clock = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const sourceClock = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' });

  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => { now = Date.now(); }, 1000);
    return () => clearInterval(id);
  });

  const seconds = $derived(Math.max(0, Math.ceil((liveResults.nextRefresh - now) / 1000)));
  const status = $derived(
    historyStore.replayMode ? 'Replay' :
    liveResults.error && !liveResults.data ? 'Offline' :
    liveResults.stale ? 'Gammal data' :
    liveResults.busy ? 'Uppdaterar' : 'Live'
  );
  const statusDescription = $derived(
    historyStore.replayMode ? 'Du visar en sparad tidpunkt.' :
    liveResults.error ? `Senaste hämtningen misslyckades: ${liveResults.error}.` :
    liveResults.stale ? 'Visar senast sparade resultat medan källan inte svarar.' :
    liveResults.busy ? 'Hämtar senaste resultat från Valmyndigheten.' :
    'Resultatet följer den senaste hämtningen från Valmyndigheten.'
  );
  const sourceUpdate = $derived(liveResults.data?.senasteUppdateringstid ? new Date(liveResults.data.senasteUppdateringstid) : null);
  const regionalReady = $derived(regions.entries.filter(entry => entry.ok).length);
  const regionalTotal = $derived(regions.entries.length || 29);
  const fetchedLabel = $derived(liveResults.fetchedAt == null ? '—' : clock.format(liveResults.fetchedAt));
  const sourceLabel = $derived(sourceUpdate && !Number.isNaN(sourceUpdate.getTime()) ? sourceClock.format(sourceUpdate) : '—');
</script>

<details id="live-status" class="status-center" class:warning={status === 'Offline' || status === 'Gammal data'}>
  <summary>
    <span class="status-dot" aria-hidden="true"></span>
    <span>{status}</span>
    <span class="status-chevron" aria-hidden="true">⌄</span>
  </summary>
  <div class="status-popover">
    <p class="status-description">{statusDescription}</p>
    <dl>
      <div><dt>Senaste hämtning</dt><dd>{fetchedLabel}</dd></div>
      <div><dt>Källans uppdatering</dt><dd>{sourceLabel}</dd></div>
      <div><dt>Länsflöden</dt><dd>{regionalReady} / {regionalTotal}</dd></div>
      {#if !historyStore.replayMode}
        <div><dt>Nästa hämtning</dt><dd>{liveResults.busy ? 'Pågår …' : `${seconds} s`}</dd></div>
      {/if}
    </dl>
    {#if liveResults.error}
      <p class="status-error">{liveResults.error}</p>
    {/if}
    {#if historyStore.replayMode}
      <p class="status-replay">Följ live igen i tidslinjen för att återgå till aktuella resultat.</p>
    {/if}
  </div>
</details>

<style>
  .status-center { position: relative; font-family: var(--font-display); font-size: 12px; }
  summary { display: flex; align-items: center; gap: 7px; list-style: none; cursor: pointer; color: var(--text); }
  summary::-webkit-details-marker { display: none; }
  summary:focus-visible { outline: 2px solid var(--red-bright); outline-offset: 4px; }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green-up); box-shadow: 0 0 0 3px rgba(107, 208, 138, 0.15); }
  .warning .status-dot { background: var(--red-bright); box-shadow: 0 0 0 3px rgba(255, 92, 92, 0.15); }
  .status-chevron { color: var(--muted); font-size: 16px; line-height: 10px; transition: transform .15s; }
  details[open] .status-chevron { transform: rotate(180deg); }
  .status-popover { position: absolute; top: calc(100% + 12px); right: 0; z-index: 25; width: 290px; padding: 14px; background: var(--panel); border: 1px solid var(--line); box-shadow: 0 12px 30px rgba(0, 0, 0, .4); white-space: normal; overflow-wrap: anywhere; }
  .status-description, .status-error, .status-replay { margin: 0 0 12px; line-height: 1.35; }
  .status-description { color: var(--muted); }
  .status-error { color: var(--red-bright); }
  .status-replay { color: var(--red-bright); }
  dl { display: grid; gap: 8px; margin: 0; }
  dl div { display: flex; justify-content: space-between; gap: 12px; }
  dt { color: var(--muted); }
  dd { margin: 0; color: var(--text); text-align: right; font-variant-numeric: tabular-nums; }
  @media (max-width: 700px) {
    .status-popover { position: fixed; top: 66px; right: 12px; width: min(290px, calc(100vw - 24px)); }
  }
</style>
