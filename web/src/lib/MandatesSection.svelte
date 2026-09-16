<script lang="ts">
  import { currentView } from './currentView.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { allocateSeats, mandateMargins, seatUncertainty, colors } from './model.ts';
  import { tween } from './tween.ts';
  import MandateFlow from './MandateFlow.svelte';

  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (value: number | null) => (value == null ? '—' : `${decimal.format(value)} %`);
  const formatSeats = (value: number | null) => (value == null ? '—' : String(Math.round(value)));

  const seatsTotal = $derived(filters.area ? 29 : 349);
  const estimate = $derived(allocateSeats(currentView.area, seatsTotal));
  const official = $derived(Boolean(currentView.area?.partiMandat || currentView.area?.mandatfordelning));
  const range = $derived(official ? null : seatUncertainty(currentView.area, seatsTotal));
  const margins = $derived(mandateMargins(currentView.area, seatsTotal));
  const coverage = $derived(range ? Math.round(range.coverage * 100) : null);

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
  <div class:official class="mandate-status" role="note">
    <strong>{official ? 'OFFICIELL MANDATFÖRDELNING' : 'BERÄKNAD MANDATFÖRDELNING'}</strong>
    <span>{official ? 'Källa: Valmyndigheten' : filters.area ? 'Illustrativ regional uppskattning' : 'Modifierad Sainte-Laguë på rapporterade röster'}</span>
  </div>
  {#if !estimate}
    <p class="empty-state">Mandat kan visas när tillräckliga partier och giltiga röster har publicerats.</p>
  {:else}
    {#if !official}
      <div class="uncertainty-note">
        <div class="uncertainty-heading">
          <strong>Vad betyder intervallet?</strong>
          <span>{coverage == null ? 'Begränsat underlag' : `${coverage} % av distrikten räknade`}</span>
        </div>
        <p>Den stora siffran är en beräkning utifrån rapporterade röster. Färgfältet visar ett scenariointervall för möjliga mandat när återstående distrikt fördelas annorlunda. Det är inte ett statistiskt konfidensintervall eller ett officiellt besked.</p>
        <p>Partier under <strong>4 % i riket</strong> räknas inte in i den nationella fördelningen. Regionala mandat visas som en illustrativ jämförelse och följer inte den nationella mandatfördelningen.</p>
        <details>
          <summary>Metod och begränsningar</summary>
          <p>Vi använder modifierad Sainte-Laguë på giltiga röster och fördelar {estimate.seats} platser. Intervallet testar försiktiga upp- och nerscenarier baserat på hur stor del av räkningen som återstår. När fler distrikt rapporterar blir intervallet normalt smalare.</p>
        </details>
      </div>
    {:else}
      <p class="official-note">Detta är mandatdata som publicerats av Valmyndigheten. Inget scenariointervall läggs ovanpå den officiella fördelningen.</p>
    {/if}
    <div class="mandate-summary">
      <article class="mandate-card block-left">
        <span>Vänster</span>
        <strong use:tween={{ value: leftSeats, format: formatSeats, version: currentView.data }}></strong>
        <small>av {estimate.seats} platser</small>
      </article>
      <article class="mandate-card block-right">
        <span>Höger</span>
        <strong use:tween={{ value: rightSeats, format: formatSeats, version: currentView.data }}></strong>
        <small>av {estimate.seats} platser</small>
      </article>
      <article class="mandate-card block-other">
        <span>Övriga / under 4 %</span>
        <strong use:tween={{ value: otherSeats, format: formatSeats, version: currentView.data }}></strong>
        <small>av {estimate.seats} platser</small>
      </article>
    </div>
    <MandateFlow />
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
          <span class="share">{pct(p.share)} {#if !official}· {r.low}–{r.high} möjliga{/if}</span>
          <strong use:tween={{ value: p.seats, format: formatSeats, version: currentView.data }}></strong>
          {#if official}
            <div class="seat-track official-track"><b class="marker" style="left: {(p.seats / estimate.seats) * 100}%; border-color: {colors[p.key] || '#92958c'}"></b></div>
          {:else}
            <div class="seat-track">
              <i class="band" style="left: {(r.low / estimate.seats) * 100}%; width: {Math.max(0, ((r.high - r.low) / estimate.seats) * 100)}%; background: {colors[p.key] || '#92958c'}"></i>
              <b class="marker" style="left: {(p.seats / estimate.seats) * 100}%; border-color: {colors[p.key] || '#92958c'}"></b>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .section-top { margin-bottom: 6px; }
  h2 { font-size: 22px; font-weight: 700; letter-spacing: 0.3px; }
  .mandate-status { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px 14px; margin: 0 0 16px; padding: 10px 12px; border-left: 3px solid var(--amber, #daa83b); background: var(--panel); color: var(--muted); font-family: var(--font-display); font-size: 11px; }
  .mandate-status strong { color: #daa83b; letter-spacing: 1px; }
  .mandate-status.official { border-left-color: var(--green-up); }
  .mandate-status.official strong { color: var(--green-up); }
  .uncertainty-note { margin: 0 0 18px; padding: 14px 16px; border: 1px solid #665020; background: rgba(102, 80, 32, .14); color: var(--muted); font-size: 12px; line-height: 1.5; }
  .uncertainty-note p { margin: 7px 0 0; }
  .uncertainty-heading { display: flex; justify-content: space-between; gap: 12px; color: var(--text); }
  .uncertainty-heading span { color: #daa83b; font-family: var(--font-display); font-size: 11px; }
  .uncertainty-note details { margin-top: 10px; }
  .uncertainty-note summary { color: var(--text); cursor: pointer; font-family: var(--font-display); font-size: 11px; }
  .official-note { margin: -4px 0 16px; color: var(--muted); font-size: 12px; }
  .empty-state { color: var(--muted); font-size: 12px; }
  .mandate-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); margin-bottom: 16px; }
  .mandate-card { padding: 14px 16px; background: var(--panel); border-top: 3px solid var(--red); }
  .mandate-card.block-right { border-top-color: #2f5fa8; }
  .mandate-card.block-other { border-top-color: var(--muted); }
  .mandate-card span, .mandate-card small { display: block; font-family: var(--font-display); letter-spacing: 0.5px; text-transform: uppercase; color: var(--muted); font-size: 11px; }
  .mandate-card strong { display: block; font-family: var(--font-display); font-weight: 700; font-size: 30px; margin: 5px 0 2px; }
  .mandate-margins { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0 0 16px; padding: 10px 12px; border: 1px solid var(--line); color: var(--muted); font-size: 11px; }
  .mandate-margins .title { font-family: var(--font-display); font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 1px; }
  .mandate-party-list { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .mandate-party { position: relative; display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line-soft); font-size: 12px; }
  .mandate-party .share { color: var(--muted); }
  .mandate-party strong { font-family: var(--font-display); font-size: 16px; width: 22px; text-align: right; }
  .seat-track { grid-column: 1 / -1; position: relative; height: 4px; background: var(--line-soft); }
  .official-track { background: var(--line); }
  .band { position: absolute; top: 0; bottom: 0; opacity: 0.4; }
  .marker { position: absolute; top: -2px; width: 2px; height: 8px; border-left: 2px solid; }
</style>
