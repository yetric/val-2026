<script lang="ts">
  import { historyStore } from './historyStore.svelte.ts';

  const speed = 2000;
  const maxIndex = $derived(Math.max(0, historyStore.entries.length - 1));
  const timelineValue = $derived(historyStore.replayMode ? Math.max(0, historyStore.replayIndex) : maxIndex);
</script>

<div class="replay-controls">
  <button type="button" onclick={() => historyStore.play(speed)} disabled={historyStore.entries.length < 2}>
    {historyStore.playing ? 'Ⅱ Pausa' : '▶ Spela upp'}
  </button>
  <button type="button" aria-label="Föregående sparade resultat"
    disabled={historyStore.entries.length < 2 || (historyStore.replayMode && historyStore.replayIndex <= 0)}
    onclick={() => { historyStore.stop(); historyStore.showSnapshot(historyStore.replayMode ? historyStore.replayIndex - 1 : historyStore.entries.length - 2); }}>←</button>
  <input type="range" min="0" max={maxIndex} value={timelineValue}
    disabled={historyStore.entries.length < 2}
    oninput={(event: Event) => { historyStore.stop(); historyStore.showSnapshot(Number((event.target as HTMLInputElement).value)); }} />
  <button type="button" aria-label="Nästa sparade resultat"
    disabled={!historyStore.replayMode || historyStore.replayIndex >= historyStore.entries.length - 1}
    onclick={() => { historyStore.stop(); historyStore.showSnapshot(historyStore.replayIndex + 1); }}>→</button>
  <button type="button" class="go-live" class:active={!historyStore.replayMode} onclick={() => historyStore.goLive()}>● Följ live</button>
</div>
{#if historyStore.replayMode}
  <p class="replay-note">Visar sparad tidpunkt {historyStore.replayIndex + 1} av {historyStore.entries.length} — inte live.</p>
{/if}
{#if historyStore.error}
  <p class="replay-error">{historyStore.error}</p>
{/if}

<style>
  .replay-controls { display: flex; align-items: center; gap: 10px; margin: 20px 0; }
  button { border: 1px solid var(--line); background: transparent; color: var(--text); font-family: var(--font-display); font-size: 12px; letter-spacing: 0.5px; padding: 8px 11px; cursor: pointer; }
  button:disabled { opacity: 0.4; cursor: default; }
  .go-live.active { background: var(--red); border-color: var(--red); color: #fff; }
  input[type='range'] { flex: 1; min-width: 60px; accent-color: var(--red-bright); cursor: pointer; }
  .replay-note { font-family: var(--font-display); font-size: 12px; color: var(--red-bright); margin: 0 0 12px; }
  .replay-error { font-size: 11px; color: var(--red-bright); margin: 0 0 12px; }
</style>
