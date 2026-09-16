<script lang="ts">
  import { notifications } from './notifications.svelte.ts';
  import { audio } from './audio.svelte.ts';
  import { analytics } from './analytics.svelte.ts';
  import { download } from './download.ts';
</script>

<div class="notification-center">
  {#if notifications.items.length}
    <div class="notifications" aria-live="polite" aria-label="Nya händelser">
      {#each notifications.items as item (item.id)}
        <div class="notification">
          <span>{item.message}</span>
          <button type="button" aria-label="Stäng meddelandet" onclick={() => notifications.dismiss(item.id)}>×</button>
        </div>
      {/each}
    </div>
  {/if}
  <details class="notification-settings">
    <summary aria-label="Aviseringsinställningar">⚙ Aviseringar</summary>
    <div class="settings-panel">
      <strong>Aviseringar</strong>
      <label><input type="checkbox" checked={notifications.preferences.completion}
        onchange={(event) => notifications.setPreference('completion', (event.currentTarget as HTMLInputElement).checked)} /> Färdigräknade områden</label>
      <label><input type="checkbox" checked={notifications.preferences.mandate}
        onchange={(event) => notifications.setPreference('mandate', (event.currentTarget as HTMLInputElement).checked)} /> Mandatförändringar</label>
      <label><input type="checkbox" checked={notifications.preferences.muted}
        onchange={(event) => notifications.setPreference('muted', (event.currentTarget as HTMLInputElement).checked)} /> Tysta alla aviseringar</label>
      {#if audio.supported}
        <label><input type="checkbox" checked={audio.preferences.enabled}
          onchange={(event) => audio.setPreference('enabled', (event.currentTarget as HTMLInputElement).checked)} /> Ljudsignaler</label>
        <label class="range-label">Volym
          <input type="range" min="0" max="1" step="0.05" value={audio.preferences.volume}
            oninput={(event) => audio.setPreference('volume', Number((event.currentTarget as HTMLInputElement).value))} />
        </label>
        <label><input type="checkbox" checked={audio.preferences.quietHours}
          onchange={(event) => audio.setPreference('quietHours', (event.currentTarget as HTMLInputElement).checked)} /> Tysta ljud 22:00–08:00</label>
        <label><input type="checkbox" checked={audio.preferences.reduced}
          onchange={(event) => audio.setPreference('reduced', (event.currentTarget as HTMLInputElement).checked)} /> Reducera ljud (en kort ton)</label>
        <button type="button" class="sound-button" onclick={() => audio.play('completion')}>Testa ljudsignal</button>
      {/if}
      {#if notifications.browserSupported && notifications.browserPermission !== 'denied'}
        <button type="button" class="browser-button" onclick={() => notifications.enableBrowserNotifications()}>
          {notifications.browserPermission === 'granted' ? 'Webbläsaraviseringar aktiverade' : 'Tillåt webbläsaraviseringar'}
        </button>
      {:else}
        <span class="browser-note">Webbläsaraviseringar är blockerade i denna webbläsare.</span>
      {/if}
      <div class="analytics-settings">
        <strong>Produktförbättring</strong>
        <p>Helt frivilliga, lokala räknare hjälper oss förstå vilka funktioner som används. Inga konton, IP-adresser eller resultat skickas.</p>
        <label><input type="checkbox" checked={analytics.enabled}
          onchange={(event) => analytics.setEnabled((event.currentTarget as HTMLInputElement).checked)} /> Tillåt lokal användningsstatistik</label>
        {#if analytics.enabled}
          <button type="button" class="browser-button" onclick={() => download(analytics.exportJson(), 'application/json', 'val2026-anvandningsstatistik.json')}>Exportera statistik</button>
          <button type="button" class="browser-button" onclick={() => analytics.clear()}>Radera statistik</button>
        {/if}
      </div>
    </div>
  </details>
</div>

<style>
  .notification-center {
    position: fixed;
    bottom: 54px;
    right: 16px;
    z-index: 30;
  }
  .notifications {
    display: grid;
    gap: 8px;
    width: min(360px, calc(100vw - 32px));
    margin-bottom: 8px;
  }
  .notification {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    justify-content: space-between;
    padding: 12px 14px;
    background: var(--panel);
    border: 1px solid var(--red);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    font-size: 13px;
  }
  .notification button {
    flex: 0 0 auto;
    border: 0;
    padding: 0;
    background: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 20px;
    line-height: 16px;
  }
  .notification button:hover { color: var(--text); }
  .notification-settings { margin-left: auto; width: max-content; font-size: 12px; }
  .notification-settings summary { padding: 7px 10px; background: var(--panel); border: 1px solid var(--line); color: var(--muted); cursor: pointer; list-style: none; }
  .notification-settings summary::-webkit-details-marker { display: none; }
  .notification-settings summary:hover, .notification-settings summary:focus-visible { color: var(--text); border-color: var(--red-bright); }
  .settings-panel { display: grid; gap: 9px; width: 250px; margin-top: 6px; padding: 12px; background: var(--panel); border: 1px solid var(--line); box-shadow: 0 8px 24px rgba(0, 0, 0, .35); }
  .settings-panel strong { font-family: var(--font-display); }
  .settings-panel label { display: flex; align-items: center; gap: 8px; color: var(--muted); cursor: pointer; }
  .settings-panel input { accent-color: var(--red-bright); }
  .range-label { display: grid !important; grid-template-columns: auto 1fr; }
  .range-label input { min-width: 0; }
  .sound-button { border: 1px solid var(--line); padding: 7px 9px; background: transparent; color: var(--text); cursor: pointer; text-align: left; font: inherit; }
  .sound-button:hover { border-color: var(--red-bright); }
  .browser-button { border: 1px solid var(--line); padding: 7px 9px; background: transparent; color: var(--text); cursor: pointer; text-align: left; font: inherit; }
  .browser-button:hover { border-color: var(--red-bright); }
  .browser-note { color: var(--muted); line-height: 1.35; }
  .analytics-settings { display: grid; gap: 7px; padding-top: 8px; border-top: 1px solid var(--line-soft); }
  .analytics-settings p { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.4; }
  @media (max-width: 700px) {
    .notification-center { bottom: 50px; right: 12px; }
  }
</style>
