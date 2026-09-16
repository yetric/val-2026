<script lang="ts">
  import { filters } from './filters.svelte.ts';
  import { currentView } from './currentView.svelte.ts';
  import { names, partyKey, partyName, partiesFor, colors } from './model.ts';
  import { watchlist, type WatchItem } from './watchlist.svelte.ts';

  const areaItems = $derived(watchlist.items.filter(item => item.kind === 'area'));
  const partyItems = $derived(watchlist.items.filter(item => item.kind === 'party'));
  const partyOptions = $derived(partiesFor(currentView.data));

  function label(item: WatchItem) {
    return item.kind === 'party' ? names[item.key] || item.key : item.key;
  }

  function open(item: WatchItem) {
    if (item.kind === 'area') filters.area = item.key;
    else if (!filters.selected.includes(item.key)) filters.toggleParty(item.key);
  }
</script>

<details id="watchlist" class="watchlist" open={watchlist.items.length > 0}>
  <summary>☆ Bevakning <span>{watchlist.items.length}</span></summary>
  <div class="watchlist-panel">
    <div class="watchlist-heading">
      <strong>Din bevakning</strong>
      <span>sparas i denna webbläsare</span>
    </div>
    {#if !watchlist.items.length}
      <p class="empty">Lägg till områden eller partier för att snabbt hitta tillbaka till dem.</p>
    {:else}
      <div class="watch-items">
        {#each watchlist.items as item (`${item.kind}-${item.key}`)}
          <div class="watch-item">
            <button type="button" onclick={() => open(item)}>
              <i class:item-party={item.kind === 'party'} style:background={item.kind === 'party' ? colors[item.key] || '#92958c' : undefined}></i>
              <span>{label(item)}</span>
            </button>
            <button type="button" class="remove" aria-label="Ta bort {label(item)} från bevakningen" onclick={() => watchlist.toggle(item.kind, item.key)}>×</button>
          </div>
        {/each}
      </div>
    {/if}
    <div class="watch-actions">
      {#if filters.area}
        <button type="button" onclick={() => watchlist.toggle('area', filters.area)}>
          {watchlist.isWatching('area', filters.area) ? '★ Sluta följa området' : '☆ Följ området'}
        </button>
      {/if}
      {#each partyOptions as party (partyKey(party))}
        {@const key = partyKey(party)}
        {#if !watchlist.isWatching('party', key)}
          <button type="button" onclick={() => watchlist.toggle('party', key)}>☆ Följ {key}</button>
        {/if}
      {/each}
    </div>
  </div>
</details>

<style>
  .watchlist { margin: -28px 0 44px; border: 1px solid var(--line); background: var(--panel); }
  summary { display: flex; align-items: center; gap: 7px; padding: 10px 14px; color: var(--text); cursor: pointer; list-style: none; font-family: var(--font-display); font-size: 12px; letter-spacing: .8px; text-transform: uppercase; }
  summary::-webkit-details-marker { display: none; }
  summary span { color: var(--muted); font-size: 11px; }
  .watchlist-panel { padding: 0 14px 14px; }
  .watchlist-heading { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
  .watchlist-heading strong { font-family: var(--font-display); }
  .watchlist-heading span, .empty { color: var(--muted); font-size: 11px; }
  .empty { margin: 0 0 10px; }
  .watch-items { display: flex; flex-wrap: wrap; gap: 5px; }
  .watch-item { display: flex; background: #000; border: 1px solid var(--line); }
  .watch-item button { display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: var(--text); padding: 6px 8px; cursor: pointer; font: inherit; font-size: 12px; }
  .watch-item button:hover { color: var(--red-bright); }
  .watch-item .remove { border-left: 1px solid var(--line); color: var(--muted); padding-inline: 7px; }
  .watch-item .remove:hover { color: var(--red-bright); }
  .watch-item i { width: 7px; height: 7px; border-radius: 50%; background: var(--red-bright); }
  .watch-item i.item-party { border-radius: 0; }
  .watch-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .watch-actions button { border: 1px solid var(--line); background: transparent; color: var(--muted); padding: 6px 8px; cursor: pointer; font: inherit; font-size: 11px; }
  .watch-actions button:hover { border-color: var(--red-bright); color: var(--text); }
  @media (max-width: 700px) {
    .watchlist { margin-top: -28px; }
    .watchlist-heading { flex-direction: column; gap: 2px; }
  }
</style>
