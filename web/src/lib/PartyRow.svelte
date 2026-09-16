<script lang="ts">
  import { partyKey, partyName, colors } from './model.ts';
  import { flash } from './flash.ts';
  import type { Comparison, Party } from './types.ts';

  interface Props {
    party: Party;
    baseline: Comparison;
    max: number;
    version: unknown;
    detailsExpanded: boolean;
    validVotes: number | null;
  }
  let { party, baseline, max, version, detailsExpanded, validVotes }: Props = $props();

  const number = new Intl.NumberFormat('sv-SE');
  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const exactDecimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const fmt = (value: number | null | undefined) => (value == null || !Number.isFinite(value)) ? '—' : number.format(value);
  const pct = (value: number | null | undefined) => (value == null ? '—' : `${decimal.format(value)} %`);
  const deltaText = (value: number | null | undefined) => (value == null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${decimal.format(Math.abs(value))}`);

  const key = $derived(partyKey(party));
  const color = $derived(colors[key] || '#92958c');
  const shareText = $derived(pct(party.andelRoster));
  const delta = $derived(baseline.delta);
  const changeText = $derived(`${delta != null && delta > 0 ? '↗ ' : delta != null && delta < 0 ? '↘ ' : ''}${deltaText(delta)}`);
  const changeClass = $derived(delta != null && delta > 0 ? 'positive' : delta != null && delta < 0 ? 'negative' : 'neutral');
  const votesText = $derived(fmt(party.antalRoster));
  const exactShare = $derived(validVotes != null && validVotes > 0 && Number.isFinite(party.antalRoster) ? (party.antalRoster / validVotes) * 100 : null);
</script>

<tr class="party-row">
  <th scope="row">
    <span class="party-badge" style="--party-color: {color}">{key}</span>
    <span class="party-name">{partyName(party)}</span>
  </th>
  <td class="bar-cell">
    <div class="bar-track">
      <div class="bar-previous" style="width: {(Math.max(0, baseline.share || 0) / max) * 100}%"></div>
      <div class="bar-current" style="width: {(Math.max(0, party.andelRoster || 0) / max) * 100}%; background: {color}"></div>
      <span class="threshold" style="left: {(4 / max) * 100}%"></span>
    </div>
  </td>
  <td class="numeric share" use:flash={{ value: shareText, version }}>{shareText}</td>
  <td class="numeric">
    <span class="change {changeClass}" use:flash={{ value: changeText, version }}>{changeText}</span>
  </td>
  <td class="numeric vote-column">
    <span use:flash={{ value: votesText, version }}>{votesText}</span>
    {#if exactShare != null}<small class="exact-share">{exactDecimal.format(exactShare)} %</small>{/if}
  </td>
  {#if detailsExpanded}
    <td class="numeric extra-column">{pct(party.andelRosterForegaendeVal)}</td>
    <td class="numeric extra-column">{fmt(party.antalRosterForegaendeVal)}</td>
  {/if}
</tr>

<style>
  .party-row { border-bottom: 1px solid #eeefe9; }
  th[scope='row'] { text-align: left; font-weight: 500; padding: 12px 8px 12px 0; display: flex; align-items: center; gap: 10px; }
  .party-badge { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; background: color-mix(in srgb, var(--party-color) 12%, white); color: var(--party-color); font-size: 10px; font-weight: 700; flex-shrink: 0; }
  .party-name { font-size: 12px; }
  .bar-cell { padding-right: 20px; width: 30%; }
  .bar-track { height: 20px; position: relative; background: #f2f3ee; border-radius: 3px; overflow: visible; }
  .bar-previous, .bar-current { position: absolute; left: 0; border-radius: 0 3px 3px 0; transition: width 0.7s ease; }
  .bar-previous { height: 7px; bottom: 0; background: #daddd4; }
  .bar-current { height: 10px; top: 1px; }
  .threshold { position: absolute; top: -3px; bottom: -3px; border-left: 1px dashed #bcc0b2; }
  .numeric { text-align: right; padding: 4px 6px; font-variant-numeric: tabular-nums; }
  .share { font-size: 15px; font-weight: 650; }
  .change { display: inline-block; padding: 4px 7px; border-radius: 4px; font-size: 10px; white-space: nowrap; }
  .positive { color: #507563; background: #edf4ed; }
  .negative { color: #b9665b; background: #fcf0ec; }
  .neutral { color: #777; background: #f0f0ec; }
  .vote-column { font-size: 11px; color: #444; }
  .exact-share { display: block; color: #9aa094; font-size: 9px; }
  .extra-column { color: #8b9085; font-size: 11px; }
</style>
