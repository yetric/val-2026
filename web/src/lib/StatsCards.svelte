<script lang="ts">
  import { currentView } from './currentView.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { areaMetrics } from './model.ts';
  import { flash } from './flash.ts';

  const number = new Intl.NumberFormat('sv-SE');
  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (value: number | null | undefined) => (value == null ? '—' : `${decimal.format(value)} %`);
  const fmt = (value: number | null | undefined) => (value == null ? '—' : number.format(value));

  const metrics = $derived(areaMetrics(currentView.area, Boolean(filters.area)));
  const progress = $derived(metrics.total ? ((metrics.districts ?? 0) / metrics.total) * 100 : null);
  const districtsText = $derived(fmt(metrics.districts));
  const votesText = $derived(fmt(metrics.votes));
  const turnoutText = $derived(pct(metrics.turnout));
  const eligibleText = $derived(fmt(metrics.eligible));
</script>

<section class="stats" aria-label="Räkningens framsteg">
  <article class="stat stat-progress">
    <div class="stat-label">RÄKNADE DISTRIKT <span class="tiny-dot"></span></div>
    <div class="stat-number"><span use:flash={{ value: districtsText, version: currentView.data }}>{districtsText}</span><small>/ {fmt(metrics.total)}</small></div>
    <div class="progress-track"><div class="progress-fill" style="width: {Math.min(100, progress || 0)}%"></div></div>
    <p>{progress == null ? 'Saknas i områdets sammanställning' : `${decimal.format(progress)} % av distrikten har rapporterat`}</p>
  </article>
  <article class="stat">
    <div class="stat-label">RÄKNADE RÖSTER</div>
    <div class="stat-number" use:flash={{ value: votesText, version: currentView.data }}>{votesText}</div>
    <p>Inklusive ogiltiga röster</p>
  </article>
  <article class="stat">
    <div class="stat-label">VALDELTAGANDE</div>
    <div class="stat-number" use:flash={{ value: turnoutText, version: currentView.data }}>{turnoutText}</div>
    <p>I de räknade valdistrikten</p>
  </article>
  <article class="stat">
    <div class="stat-label">RÖSTBERÄTTIGADE</div>
    <div class="stat-number" use:flash={{ value: eligibleText, version: currentView.data }}>{eligibleText}</div>
    <p>{filters.area ? 'I valt område · om källan redovisar det' : 'Totalt i hela riket'}</p>
  </article>
</section>

<style>
  .stats { display: grid; grid-template-columns: 1.16fr 1fr 1fr 1fr; margin-bottom: 24px; border: 1px solid #e5e6df; background: #fff; border-radius: 10px; overflow: hidden; }
  .stat { padding: 20px; border-right: 1px solid #e5e6df; }
  .stat:last-child { border: 0; }
  .stat-label { font-size: 9px; letter-spacing: 1.1px; font-weight: 600; color: #7b8076; display: flex; align-items: center; gap: 6px; }
  .tiny-dot { display: inline-block; width: 5px; height: 5px; background: #679478; border-radius: 50%; }
  .stat-number { font-family: Manrope, sans-serif; font-size: 28px; font-weight: 650; letter-spacing: -1px; margin-top: 11px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .stat-number small { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 400; color: #a0a39b; margin-left: 6px; }
  .stat p { font-size: 10px; color: #8b9085; margin: 8px 0 0; }
  .progress-track { height: 4px; background: #eceee7; border-radius: 4px; margin-top: 11px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--orange, #ec7146); transition: width 0.7s; }
</style>
