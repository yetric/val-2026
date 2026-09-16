<script lang="ts">
  import { onMount } from 'svelte';
  import { filters } from './filters.svelte.ts';
  import { currentView } from './currentView.svelte.ts';
  import { historyStore } from './historyStore.svelte.ts';
  import { analytics } from './analytics.svelte.ts';

  type Command = { id: string; label: string; hint: string; run: () => void };
  let open = $state(false);
  let query = $state('');
  let input = $state<HTMLInputElement>();

  function close() {
    open = false;
    query = '';
  }
  function show() {
    open = true;
    query = '';
    requestAnimationFrame(() => input?.focus());
  }
  function run(command: Command) {
    analytics.track('command_palette');
    command.run();
    close();
  }
  function scrollTo(selector: string) {
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function click(id: string) {
    (document.getElementById(id) as HTMLButtonElement | null)?.click();
  }

  const commands = $derived.by(() => {
    const navigation: Command[] = [
      { id: 'national', label: 'Visa hela riket', hint: 'Område', run: () => { filters.area = ''; scrollTo('#results-table'); } },
      ...((currentView.data?.valkretsar || []).map(area => ({
        id: `area-${area.namn}`,
        label: `Visa ${area.namn}`,
        hint: 'Område',
        run: () => { filters.area = area.namn || ''; scrollTo('#results-table'); },
      }))),
    ];
    return [
      ...navigation,
      { id: 'live', label: historyStore.replayMode ? 'Följ live' : 'Öppna replay', hint: 'Läge', run: () => historyStore.replayMode ? historyStore.goLive() : historyStore.play() },
      { id: 'compare-previous', label: 'Jämför med valet 2022', hint: 'Jämförelse', run: () => { filters.comparisonMode = 'previous'; scrollTo('#results-table'); } },
      { id: 'compare-national', label: 'Jämför med hela riket', hint: 'Jämförelse', run: () => { filters.comparisonMode = 'national'; scrollTo('#results-table'); } },
      { id: 'compare-none', label: 'Stäng av jämförelse', hint: 'Jämförelse', run: () => { filters.comparisonMode = 'none'; scrollTo('#results-table'); } },
      { id: 'watchlist', label: 'Öppna bevakning', hint: 'Navigering', run: () => { const element = document.getElementById('watchlist') as HTMLDetailsElement | null; if (element) { element.open = true; element.scrollIntoView({ behavior: 'smooth', block: 'start' }); } } },
      { id: 'share', label: 'Kopiera delningslänk', hint: 'Dela', run: () => click('share-view') },
      { id: 'csv', label: 'Exportera filtrerade resultat som CSV', hint: 'Export', run: () => click('export-csv') },
      { id: 'json', label: 'Exportera ögonblicksbild som JSON', hint: 'Export', run: () => click('export-json') },
    ].filter(command => `${command.label} ${command.hint}`.toLocaleLowerCase('sv-SE').includes(query.trim().toLocaleLowerCase('sv-SE')));
  });

  onMount(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        open ? close() : show();
      } else if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName)) {
        event.preventDefault();
        show();
      } else if (event.key === 'Escape' && open) close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  });
</script>

<button type="button" class="palette-trigger" aria-label="Öppna kommandopalett" onclick={show}>⌘ K <span>Kommandon</span></button>

{#if open}
  <div class="backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div class="palette" role="dialog" aria-modal="true" aria-labelledby="palette-title">
      <div class="palette-head">
        <h2 id="palette-title">Kommandon</h2>
        <kbd>ESC</kbd>
      </div>
      <input bind:this={input} bind:value={query} type="search" placeholder="Sök kommando eller område…" aria-label="Sök kommando eller område" />
      <div class="command-list" aria-label="Kommandon">
        {#if !commands.length}<p class="empty">Inga kommandon matchar sökningen.</p>{/if}
        {#each commands.slice(0, 12) as command (command.id)}
          <button type="button" onclick={() => run(command)}>
            <span>{command.label}</span><small>{command.hint}</small>
          </button>
        {/each}
      </div>
      <p class="shortcut-note">Tips: tryck <kbd>Ctrl K</kbd> eller <kbd>/</kbd> när som helst.</p>
    </div>
  </div>
{/if}

<style>
  .palette-trigger { position: fixed; top: 88px; right: 40px; z-index: 18; border: 1px solid var(--line); background: var(--panel); color: var(--muted); padding: 7px 9px; cursor: pointer; font-family: var(--font-display); font-size: 11px; }
  .palette-trigger:hover, .palette-trigger:focus-visible { border-color: var(--red-bright); color: var(--text); }
  .palette-trigger span { margin-left: 5px; }
  .backdrop { position: fixed; inset: 0; z-index: 40; display: grid; place-items: start center; padding-top: 14vh; background: rgba(0, 0, 0, .72); }
  .palette { width: min(620px, calc(100vw - 28px)); border: 1px solid var(--line); background: var(--panel); box-shadow: 0 18px 80px rgba(0, 0, 0, .6); }
  .palette-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px 10px; }
  h2 { font-size: 20px; }
  input { width: calc(100% - 36px); margin: 0 18px 10px; padding: 11px 12px; border: 1px solid var(--line); background: #000; color: var(--text); outline: none; }
  input:focus { border-color: var(--red-bright); box-shadow: 0 0 0 2px rgba(255, 92, 92, .2); }
  .command-list { max-height: 48vh; overflow-y: auto; border-top: 1px solid var(--line-soft); }
  .command-list button { display: flex; justify-content: space-between; width: 100%; gap: 12px; border: 0; border-bottom: 1px solid var(--line-soft); background: transparent; color: var(--text); padding: 11px 18px; text-align: left; cursor: pointer; }
  .command-list button:hover, .command-list button:focus-visible { background: rgba(255, 255, 255, .07); outline: none; }
  .command-list small, .empty, .shortcut-note { color: var(--muted); font-size: 11px; }
  .empty { padding: 18px; text-align: center; }
  .shortcut-note { margin: 0; padding: 11px 18px 14px; }
  kbd { border: 1px solid var(--line); background: #000; padding: 2px 5px; font-family: var(--font-display); font-size: 10px; }
  @media (max-width: 700px) {
    .palette-trigger { top: 74px; right: 16px; }
    .palette-trigger span { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .backdrop { scroll-behavior: auto; }
  }
</style>
