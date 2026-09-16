<script lang="ts">
  import type { Snippet } from 'svelte';
  import LiveTicker from './LiveTicker.svelte';

  let { children }: { children: Snippet } = $props();

  let container: HTMLDivElement | undefined = $state();
  let isFullscreen = $state(false);

  function toggle() {
    if (!container) return;
    if (document.fullscreenElement === container) document.exitFullscreen();
    else container.requestFullscreen();
  }

  $effect(() => {
    const handler = () => { isFullscreen = document.fullscreenElement === container; };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  });
</script>

<div class="fullscreen-panel" bind:this={container}>
  <button type="button" class="expand-toggle" onclick={toggle} aria-label={isFullscreen ? 'Avsluta helskärm' : 'Visa i helskärm'} title={isFullscreen ? 'Avsluta helskärm (Esc)' : 'Visa i helskärm'}>
    {#if isFullscreen}
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 3v3.5A1.5 1.5 0 0 1 6.5 8H3M17 8h-3.5A1.5 1.5 0 0 1 12 6.5V3M12 17v-3.5a1.5 1.5 0 0 1 1.5-1.5H17M3 12h3.5A1.5 1.5 0 0 1 8 13.5V17" stroke-linecap="round" stroke-linejoin="round"/></svg>
    {:else}
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 3H3v4M13 3h4v4M7 17H3v-4M13 17h4v-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    {/if}
  </button>
  <div class="fullscreen-main">
    <div class="fullscreen-frame">
      <div class="fullscreen-content">
        {@render children()}
      </div>
    </div>
  </div>
  {#if isFullscreen}
    <div class="fullscreen-ticker"><LiveTicker /></div>
  {/if}
</div>

<style>
  .fullscreen-panel { position: relative; }
  .expand-toggle {
    position: absolute; top: -6px; right: -6px; z-index: 5;
    display: grid; place-items: center; width: 30px; height: 30px;
    border: 1px solid var(--line); background: var(--bg); color: var(--muted);
    cursor: pointer; opacity: 0; transition: opacity 0.15s;
  }
  .fullscreen-panel:hover .expand-toggle,
  .expand-toggle:focus-visible { opacity: 1; }
  .expand-toggle:hover { color: var(--text); border-color: var(--muted); }
  .fullscreen-panel:fullscreen { background: var(--bg); display: flex; flex-direction: column; }
  .fullscreen-panel:fullscreen .fullscreen-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 56px; overflow: auto; min-height: 0; }
  /* Cap the frame at 16:9 (relative to viewport height) so ultrawide screens
     letterbox instead of stretching content edge to edge. zoom lives on the
     inner content, not this frame, so the vh-based max-width isn't itself scaled. */
  .fullscreen-panel:fullscreen .fullscreen-frame { width: 100%; max-width: calc(100vh * 16 / 9); margin: 0 auto; }
  .fullscreen-panel:fullscreen .fullscreen-content { width: 100%; zoom: 1.35; }
  .fullscreen-panel:fullscreen .expand-toggle { opacity: 1; top: 16px; right: 16px; }
  .fullscreen-ticker { flex-shrink: 0; }
</style>
