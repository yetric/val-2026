<script lang="ts">
  import { liveResults, REFRESH_INTERVAL_MS } from './liveResults.svelte.ts';
  import { currentView } from './currentView.svelte.ts';
  import { blockResults } from './model.ts';

  const RING_R = 9;
  const RING_C = 2 * Math.PI * RING_R;
  const number = new Intl.NumberFormat('sv-SE');
  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt = (value: number | null) => (value == null ? '—' : number.format(value));

  let now = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => { now = Date.now(); }, 1000);
    return () => clearInterval(id);
  });

  const seconds = $derived(Math.max(0, Math.ceil((liveResults.nextRefresh - now) / 1000)));
  const dashoffset = $derived(RING_C * (1 - seconds / (REFRESH_INTERVAL_MS / 1000)));
  const countdownLabel = $derived(liveResults.busy ? 'Hämtar senaste resultat…' : `Nästa uppdatering om ${seconds} s`);

  const counted = $derived(currentView.data?.antalValdistriktRaknade ?? null);
  const total = $derived(currentView.data?.antalValdistriktSomSkaRaknas ?? null);
  const progress = $derived(counted != null && total ? (counted / total) * 100 : null);

  const gap = $derived.by(() => {
    if (!currentView.area) return null;
    const [left, right] = blockResults(currentView.area);
    if (left.share == null || right.share == null) return null;
    return left.share - right.share;
  });
  const gapLabel = $derived(
    gap == null ? 'Blockskillnad —' : `${gap > 0 ? 'Vänster' : gap < 0 ? 'Höger' : 'Lika'} ${Math.abs(gap) < 0.000001 ? 'block' : `${decimal.format(Math.abs(gap))} pp`}`
  );
</script>

<header>
  <a class="brand" href="/" aria-label="Val2026 startsida">
    <span class="brand-icon">v.</span>val<span class="brand-year">2026</span>
  </a>
  <div class="header-status" aria-live="polite">
    <span class="header-count">
      <span><b>{fmt(counted)}</b> av <b>{fmt(total)}</b> distrikt</span>
      <span class="header-progress-row">
        <span class="header-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"
          aria-valuenow={Math.round(progress || 0)} aria-label="Andel distrikt räknade"
          title={progress == null ? 'Andel distrikt räknade saknas' : `${decimal.format(progress)} % av distrikten räknade`}>
          <i style="width: {Math.min(100, progress || 0)}%"></i>
        </span>
        <span>{progress == null ? '—' : `${decimal.format(progress)} %`}</span>
      </span>
    </span>
    <span class="header-divider"></span>
    <span id="header-gap">{gapLabel}</span>
    <span class="header-countdown" class:busy={liveResults.busy} title={countdownLabel}>
      <svg class="countdown-ring" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
        <circle class="countdown-ring-track" cx="11" cy="11" r={RING_R}></circle>
        <circle class="countdown-ring-fill" cx="11" cy="11" r={RING_R}
          stroke-dasharray="{RING_C} {RING_C}" stroke-dashoffset={liveResults.busy ? undefined : dashoffset}></circle>
      </svg>
      <span class="sr-only">{countdownLabel}</span>
    </span>
  </div>
  <a class="source-link" href="https://resultat.val.se/val2026/RD?r=P" target="_blank" rel="noopener">
    Valmyndigheten <span>↗</span>
  </a>
</header>

<style>
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
  header { height: 96px; border-bottom: 1px solid #e5e6df; display: flex; align-items: center; justify-content: space-between; padding: 0 5.5%; background: #fafaf6; position: sticky; top: 0; z-index: 20; }
  .brand { display: flex; align-items: center; font-family: Manrope, sans-serif; font-size: 27px; font-weight: 800; letter-spacing: -1.4px; color: inherit; text-decoration: none; }
  .brand-icon { display: inline-grid; place-items: center; width: 36px; height: 36px; background: #ec7146; color: #fff; border-radius: 10px; margin-right: 10px; font-size: 28px; padding-bottom: 4px; }
  .brand-year { font-weight: 500; color: #72776d; }
  .source-link { font-size: 12px; color: inherit; text-decoration: none; }
  .source-link span { margin-left: 14px; }
  .header-status { display: flex; align-items: center; gap: 13px; margin-left: auto; margin-right: 36px; color: #68725e; font-size: 11px; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .header-status b { font-weight: 700; color: #30372d; }
  .header-count { display: flex; flex-direction: column; gap: 5px; min-width: 112px; }
  .header-progress-row { display: flex; align-items: center; gap: 6px; }
  .header-progress { flex: 1; height: 4px; background: #e2e6d9; border-radius: 3px; overflow: hidden; }
  .header-progress i { display: block; height: 100%; width: 0; background: #829873; border-radius: 3px; transition: width .5s; }
  .header-progress-row span:last-child { font-size: 9px; color: #7c8672; font-weight: 650; }
  .header-divider { width: 1px; height: 16px; background: #d9ddd2; }
  #header-gap { color: #657b62; }
  #header-gap::before { content: '●'; font-size: 8px; margin-right: 6px; color: #71936d; }
  .header-countdown { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0; border: 1px solid #d8dfd0; border-radius: 50%; background: #eef3e9; padding: 0; }
  .countdown-ring { width: 19px; height: 19px; transform: rotate(-90deg); }
  .countdown-ring-track { fill: none; stroke: #d8dfd0; stroke-width: 2.4; }
  .countdown-ring-fill { fill: none; stroke: #50654d; stroke-width: 2.4; stroke-linecap: round; transition: stroke-dashoffset 1s linear; }
  .header-countdown.busy .countdown-ring-fill { transition: none; animation: countdown-pulse 1s ease-in-out infinite; }
  @keyframes countdown-pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .countdown-ring-fill { transition: none; }
    .header-countdown.busy .countdown-ring-fill { animation: none; opacity: .7; }
  }
</style>
