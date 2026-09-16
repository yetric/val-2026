<script lang="ts">
  import { currentView } from './currentView.svelte.ts';
  import { numeric } from './model.ts';
  import { filters } from './filters.svelte.ts';
  import { flash } from './flash.ts';

  const number = new Intl.NumberFormat('sv-SE');
  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt = (value: number | null | undefined) => (value == null ? '—' : number.format(value));
  const pct = (value: number | null | undefined) => (value == null ? '—' : `${decimal.format(value)} %`);

  const invalid = $derived(currentView.area?.rosterEjPaverkaMandat);
  const blankText = $derived(fmt(invalid?.blankaRoster?.antalRoster));
  const unregisteredText = $derived(fmt(invalid?.rosterEjAnmaltDeltagande?.antalRoster));
  const otherInvalidText = $derived(fmt(invalid?.ovrigaOgiltiga?.antalRoster));
  const invalidTotalText = $derived(invalid ? `${fmt(invalid.antalRoster)} (${pct(invalid.andelRosterAvTotaltAntalRoster)})` : '—');
  const validVotesText = $derived(fmt(currentView.area?.rosterPaverkaMandat?.antalRoster));
  const invalidPreviousText = $derived(invalid ? `${fmt(invalid.antalRosterForegaendeVal)} (${pct(invalid.andelRosterAvTotaltAntalRosterForegaendeVal)})` : '—');
  const countedEligibleText = $derived(
    filters.area && !(Number(numeric(currentView.area?.antalRostberattigadeIRaknadeValdistrikt)) > 0)
      ? 'Saknas i sammanställningen'
      : fmt(numeric(currentView.area?.antalRostberattigadeIRaknadeValdistrikt))
  );
  const turnoutPreviousText = $derived(currentView.area?.valdeltagandeForegaendeVal || 'Saknas i sammanställningen');

  const sourceMessage = $derived.by(() => {
    const messages = [
      currentView.data?.test ? 'Källan markerar detta som testdata.' : '',
      currentView.area?.meddelandetext,
      currentView.area?.meddelandetextValomrade,
      currentView.data?.jamforbar === false ? 'Källan markerar resultatet som ej jämförbart med föregående val.' : '',
    ].filter(Boolean);
    return messages.join(' ') || 'Inga ytterligare meddelanden i resultatet.';
  });
  const mandateStatus = $derived(
    currentView.area?.partiMandat || currentView.area?.mandatfordelning
      ? 'Källan innehåller mandatdata. Hämta hela ögonblicksbilden för att se uppgifterna.'
      : 'Ingen mandatfördelning har publicerats i detta resultat. Röstandelar är inte en mandatprognos.'
  );
</script>

<section class="invalid" id="details-section">
  <div>
    <h3>Ogiltiga röster</h3>
    <p>Ingår inte i partiernas röstandelar.</p>
  </div>
  <div class="invalid-stat"><span>Blanka</span><strong use:flash={{ value: blankText, version: currentView.data }}>{blankText}</strong></div>
  <div class="invalid-stat"><span>Ej anmälda partier</span><strong use:flash={{ value: unregisteredText, version: currentView.data }}>{unregisteredText}</strong></div>
  <div class="invalid-stat"><span>Övriga ogiltiga</span><strong use:flash={{ value: otherInvalidText, version: currentView.data }}>{otherInvalidText}</strong></div>
  <div class="invalid-stat invalid-total"><span>Totalt</span><strong use:flash={{ value: invalidTotalText, version: currentView.data }}>{invalidTotalText}</strong></div>
</section>

<section class="more-data">
  <div>
    <h3>Bakom siffrorna</h3>
    <dl>
      <div><dt>Giltiga röster</dt><dd use:flash={{ value: validVotesText, version: currentView.data }}>{validVotesText}</dd></div>
      <div><dt>Ogiltiga röster 2022</dt><dd>{invalidPreviousText}</dd></div>
      <div><dt>Röstberättigade i räknade distrikt</dt><dd use:flash={{ value: countedEligibleText, version: currentView.data }}>{countedEligibleText}</dd></div>
      <div><dt>Valdeltagande 2022</dt><dd>{turnoutPreviousText}</dd></div>
    </dl>
  </div>
  <div>
    <h3>Från källan</h3>
    <p>{sourceMessage}</p>
    <p>{mandateStatus}</p>
  </div>
</section>

<style>
  .invalid { display: flex; align-items: center; gap: 32px; margin-bottom: 44px; padding: 20px 24px; background: var(--panel); border: 1px solid var(--line); flex-wrap: wrap; }
  .invalid > div:first-child { margin-right: auto; }
  .invalid h3 { font-family: var(--font-display); font-size: 14px; margin: 0; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
  .invalid p { font-size: 11px; color: var(--muted); margin: 5px 0 0; }
  .invalid-stat { display: flex; flex-direction: column; gap: 6px; }
  .invalid-stat > span { font-family: var(--font-display); font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; color: var(--muted); }
  .invalid-stat strong { font-family: var(--font-display); font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .invalid-total { border-left: 1px solid var(--line); padding-left: 24px; }
  .more-data { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--line); border: 1px solid var(--line); margin-bottom: 44px; }
  .more-data > div { background: var(--panel); padding: 20px; }
  .more-data h3 { font-family: var(--font-display); font-size: 14px; margin: 0 0 12px; letter-spacing: 0.5px; text-transform: uppercase; }
  .more-data dl { margin: 0; }
  .more-data dl div { display: flex; justify-content: space-between; gap: 14px; padding: 8px 0; border-bottom: 1px solid var(--line-soft); font-size: 12px; }
  .more-data dl div:last-child { border: 0; }
  .more-data dt { color: var(--muted); }
  .more-data dd { margin: 0; text-align: right; }
  .more-data p { font-size: 12px; line-height: 1.7; color: var(--muted); margin: 0 0 8px; }
</style>
