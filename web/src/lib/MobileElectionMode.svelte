<script lang="ts">
  import { onMount } from 'svelte';
  import { historyStore } from './historyStore.svelte.ts';

  type Destination = { id: string; label: string; icon: string; selector: string };
  const destinations: Destination[] = [
    { id: 'live', label: 'Live', icon: '●', selector: '#live-status' },
    { id: 'results', label: 'Resultat', icon: '▤', selector: '#results-table' },
    { id: 'areas', label: 'Områden', icon: '⌖', selector: '.regions-section' },
    { id: 'mandates', label: 'Mandat', icon: '▥', selector: '.mandates-section' },
  ];
  let active = $state('live');

  function go(destination: Destination) {
    active = destination.id;
    document.querySelector(destination.selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onMount(() => {
    const sections = destinations
      .map(destination => ({ destination, element: document.querySelector(destination.selector) }))
      .filter((item): item is { destination: Destination; element: Element } => Boolean(item.element));
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) active = sections.find(item => item.element === visible.target)?.destination.id || active;
    }, { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.5] });
    sections.forEach(item => observer.observe(item.element));
    return () => observer.disconnect();
  });
</script>

<nav class="mobile-nav" aria-label="Snabbnavigering för valnatten">
  {#each destinations as destination (destination.id)}
    <button type="button" class:active={active === destination.id} aria-current={active === destination.id ? 'location' : undefined} onclick={() => go(destination)}>
      <span aria-hidden="true">{destination.icon}</span>
      <small>{destination.label}</small>
    </button>
  {/each}
  <button type="button" class:live={historyStore.replayMode} onclick={() => historyStore.replayMode ? historyStore.goLive() : historyStore.play()} title={historyStore.replayMode ? 'Följ live' : 'Spela upp sparade resultat'}>
    <span aria-hidden="true">{historyStore.replayMode ? '↗' : '▶'}</span>
    <small>{historyStore.replayMode ? 'Följ live' : 'Replay'}</small>
  </button>
</nav>

<style>
  .mobile-nav { display: none; }
  @media (max-width: 700px) {
    .mobile-nav { position: fixed; right: 0; bottom: 38px; left: 0; z-index: 14; display: grid; grid-template-columns: repeat(5, 1fr); padding: 5px max(8px, env(safe-area-inset-left)) calc(5px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); background: rgba(11, 11, 13, .96); backdrop-filter: blur(12px); }
    .mobile-nav button { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 42px; border: 0; border-radius: 2px; background: transparent; color: var(--muted); cursor: pointer; }
    .mobile-nav button span { font-family: var(--font-display); font-size: 16px; line-height: 18px; }
    .mobile-nav button small { font-family: var(--font-display); font-size: 10px; letter-spacing: .3px; }
    .mobile-nav button.active, .mobile-nav button.live { color: var(--text); }
    .mobile-nav button.active span { color: var(--red-bright); }
    .mobile-nav button:focus-visible { outline: 2px solid var(--red-bright); outline-offset: -2px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .mobile-nav { backdrop-filter: none; }
  }
</style>
