<script lang="ts">
  import { currentView } from './currentView.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { allocateSeats, mandateMargins, seatUncertainty, colors } from './model.ts';
  import { flash } from './flash.ts';

  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (value: number | null) => (value == null ? '—' : `${decimal.format(value)} %`);

  const seatsTotal = $derived(filters.area ? 29 : 349);
  const estimate = $derived(allocateSeats(currentView.area, seatsTotal));
  const range = $derived(seatUncertainty(currentView.area, seatsTotal));
  const official = $derived(Boolean(currentView.area?.partiMandat || currentView.area?.mandatfordelning));
  const margins = $derived(mandateMargins(currentView.area, seatsTotal));

  const leftKeys = ['S', 'V', 'MP', 'C'];
  const rightKeys = ['M', 'KD', 'SD', 'L'];
  const leftSeats = $derived(estimate ? estimate.parties.filter(p => leftKeys.includes(p.key)).reduce((sum, p) => sum + p.seats, 0) : 0);
  const rightSeats = $derived(estimate ? estimate.parties.filter(p => rightKeys.includes(p.key)).reduce((sum, p) => sum + p.seats, 0) : 0);
  const otherSeats = $derived(estimate ? Math.max(0, estimate.seats - leftSeats - rightSeats) : 0);

  function partyRange(key: string, seats: number) {
    const rp = range?.parties.find(item => item.key === key);
    return { low: rp?.low ?? seats, high: rp?.high ?? seats };
  }
</script>

<section class="mandates-section">
  <div class="section-top">
    <h2>Så kan platserna fördelas</h2>
  </div>
  <p class="mandate-mode">
    {official ? 'Officiell mandatfördelning från Valmyndigheten' : filters.area ? 'Rikstäckande metod · illustrativ regional uppskattning' : 'Beräknad uppskattning · modifierad Sainte-Laguë'}
  </p>
  {#if !estimate}
    <p class="empty-state">Mandat kan visas när tillräckliga partier och giltiga röster har publicerats.</p>
  {:else}
    <div class="mandate-summary">
      <article class="mandate-card block-left">
        <span>Vänster</span>
        <strong use:flash={{ value: String(leftSeats), version: currentView.data }}>{leftSeats}</strong>
        <small>av {estimate.seats} platser</small>
      </article>
      <article class="mandate-card block-right">
        <span>Höger</span>
        <strong use:flash={{ value: String(rightSeats), version: currentView.data }}>{rightSeats}</strong>
        <small>av {estimate.seats} platser</small>
      </article>
      <article class="mandate-card block-other">
        <span>Övriga / under 4 %</span>
        <strong use:flash={{ value: String(otherSeats), version: currentView.data }}>{otherSeats}</strong>
        <small>av {estimate.seats} platser</small>
      </article>
    </div>
    {#if margins}
      <div class="mandate-margins">
        <span class="title">Närmast mandatgränsen</span>
        <span>Vinner nästa: {margins.gain.name} ({margins.gain.key})</span>
        <span>Mest utsatt: {margins.lose.name} ({margins.lose.key})</span>
      </div>
    {/if}
    <div class="mandate-party-list">
      {#each estimate.parties as p (p.key)}
        {@const r = partyRange(p.key, p.seats)}
        <div class="mandate-party">
          <span class="name">{p.key} {p.name}</span>
          <span class="share">{pct(p.share)} · {r.low}–{r.high}</span>
          <strong use:flash={{ value: String(p.seats), version: currentView.data }}>{p.seats}</strong>
          <div class="seat-track">
            <i class="band" style="left: {(r.low / estimate.seats) * 100}%; width: {Math.max(0, ((r.high - r.low) / estimate.seats) * 100)}%; background: {colors[p.key] || '#92958c'}"></i>
            <b class="marker" style="left: {(p.seats / estimate.seats) * 100}%; border-color: {colors[p.key] || '#92958c'}"></b>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .mandates-section { background: #fff; border: 1px solid #e5e6df; border-radius: 10px; padding: 22px 24px; margin-bottom: 24px; }
  .section-top { margin-bottom: 6px; }
  h2 { font-family: Manrope, sans-serif; font-size: 20px; font-weight: 650; margin: 0; }
  .mandate-mode { font-size: 10px; color: #879379; margin: 0 0 16px; }
  .empty-state { color: #859275; font-size: 12px; }
  .mandate-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
  .mandate-card { padding: 14px 16px; border-radius: 7px; background: #f4f6ef; border-top: 3px solid #829873; }
  .mandate-card.block-right { border-top-color: #6595b8; background: #f2f6f9; }
  .mandate-card.block-other { border-top-color: #b5b8aa; background: #f7f7f3; }
  .mandate-card span, .mandate-card small { display: block; color: #849076; font-size: 10px; }
  .mandate-card strong { display: block; font: 650 26px Manrope, sans-serif; margin: 5px 0 2px; }
  .mandate-margins { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0 0 16px; padding: 9px 11px; border: 1px solid #e4e8dd; border-radius: 6px; background: #fafbf7; color: #68735f; font-size: 10px; }
  .mandate-margins .title { font-weight: 700; color: #4f5e47; text-transform: uppercase; letter-spacing: 0.04em; }
  .mandate-party-list { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .mandate-party { position: relative; display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid #edf0e8; font-size: 11px; }
  .mandate-party .share { color: #89937e; }
  .mandate-party strong { font-size: 14px; width: 22px; text-align: right; }
  .seat-track { grid-column: 1 / -1; position: relative; height: 5px; background: #edf0e8; border-radius: 3px; }
  .band { position: absolute; top: 0; bottom: 0; border-radius: 3px; opacity: 0.35; }
  .marker { position: absolute; top: -2px; width: 2px; height: 9px; border-left: 2px solid; }
</style>
