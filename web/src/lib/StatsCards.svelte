<script lang="ts">
  import { currentView } from './currentView.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { areaMetrics } from './model.ts';
  import { tween } from './tween.ts';

  const number = new Intl.NumberFormat('sv-SE');
  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (value: number | null | undefined) => (value == null ? '—' : `${decimal.format(value)} %`);
  const fmt = (value: number | null | undefined) => (value == null ? '—' : number.format(value));

  const metrics = $derived(areaMetrics(currentView.area, Boolean(filters.area)));
  const progress = $derived(metrics.total ? ((metrics.districts ?? 0) / metrics.total) * 100 : null);

  // Rough estimate, not a forecast: assumes eligible voters split evenly
  // across districts, then applies the turnout already seen so far to
  // whatever share of districts hasn't reported yet. The source's own
  // "eligible in counted districts" field doesn't scale down with district
  // coverage the way its name implies, so it can't be used for this.
  const remainingVotes = $derived.by(() => {
    if (metrics.eligible == null || metrics.turnout == null || metrics.districts == null || !metrics.total) return null;
    const remainingShare = Math.max(0, metrics.total - metrics.districts) / metrics.total;
    return Math.round(metrics.eligible * remainingShare * (metrics.turnout / 100));
  });
</script>

<section class="hero-stat" aria-label="Räkningens framsteg">
  <div class="hero-label">Distrikt räknade</div>
  <div class="hero-number">
    <span use:tween={{ value: metrics.districts, format: fmt, version: currentView.data }}></span>
    <small>av {fmt(metrics.total)}</small>
  </div>
  <div class="progress-track"><div class="progress-fill" style="width: {Math.min(100, progress || 0)}%"></div></div>
  <div class="hero-note">{progress == null ? 'Saknas i områdets sammanställning' : `${decimal.format(progress)} % rapporterat`}</div>
</section>

<section class="stats" aria-label="Fler nyckeltal">
  <article class="stat">
    <div class="stat-label">Räknade röster</div>
    <div class="stat-number" use:tween={{ value: metrics.votes, format: fmt, version: currentView.data }}></div>
    {#if remainingVotes != null}
      <p class="stat-note" title="Uppskattning: röstberättigade × andelen ej räknade distrikt × valdeltagandet hittills. Antar jämn fördelning mellan distrikt. Inte en prognos.">
        &asymp; <span use:tween={{ value: remainingVotes, format: fmt, version: currentView.data }}></span> kvar (uppskattning)
      </p>
    {/if}
  </article>
  <article class="stat">
    <div class="stat-label">Valdeltagande</div>
    <div class="stat-number" use:tween={{ value: metrics.turnout, format: pct, version: currentView.data }}></div>
  </article>
  <article class="stat">
    <div class="stat-label">Röstberättigade</div>
    <div class="stat-number" use:tween={{ value: metrics.eligible, format: fmt, version: currentView.data }}></div>
  </article>
</section>

<style>
  .hero-label, .stat-label { font-family: var(--font-display); font-size: 13px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted); }
  .hero-stat { margin-bottom: 32px; }
  .hero-number { display: flex; align-items: baseline; gap: 14px; margin-top: 6px; }
  .hero-number span { font-family: var(--font-display); font-weight: 800; font-size: 96px; line-height: 0.95; letter-spacing: -1px; }
  .hero-number small { font-family: var(--font-display); font-weight: 600; font-size: 22px; color: var(--muted); }
  .progress-track { height: 3px; background: var(--line-soft); margin-top: 12px; }
  .progress-fill { height: 100%; background: var(--text); transition: width 0.7s; }
  .hero-note { font-family: var(--font-display); font-size: 13px; color: var(--muted); margin-top: 8px; }

  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); margin-bottom: 44px; }
  .stat { background: var(--panel); padding: 16px 20px; }
  .stat-number { font-family: var(--font-display); font-size: 32px; font-weight: 700; margin-top: 6px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .stat-note { font-family: var(--font-display); font-size: 12px; color: var(--muted); margin: 6px 0 0; cursor: default; }
</style>
