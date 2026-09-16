<script lang="ts">
  import { partyKey, partyName, colors } from './model.ts';
  import { flash } from './flash.ts';
  import { tween } from './tween.ts';
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
  const delta = $derived(baseline.delta);
  const changeText = $derived(`${delta != null && delta > 0 ? '↗ ' : delta != null && delta < 0 ? '↘ ' : ''}${deltaText(delta)}`);
  const changeClass = $derived(delta != null && delta > 0 ? 'positive' : delta != null && delta < 0 ? 'negative' : 'neutral');
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
  <td class="numeric share" use:tween={{ value: party.andelRoster, format: pct, version }}></td>
  <td class="numeric">
    <span class="change {changeClass}" use:flash={{ value: changeText, version }}>{changeText}</span>
  </td>
  <td class="numeric vote-column">
    <span use:tween={{ value: party.antalRoster, format: fmt, version }}></span>
    {#if exactShare != null}<small class="exact-share">{exactDecimal.format(exactShare)} %</small>{/if}
  </td>
  {#if detailsExpanded}
    <td class="numeric extra-column">{pct(party.andelRosterForegaendeVal)}</td>
    <td class="numeric extra-column">{fmt(party.antalRosterForegaendeVal)}</td>
  {/if}
</tr>

<style>
  .party-row { border-bottom: 1px solid var(--line-soft); }
  .party-row > :first-child { padding-left: 20px; }
  .party-row > :last-child { padding-right: 20px; }
  th[scope='row'] { text-align: left; font-weight: 500; padding: 12px 8px 12px 0; display: flex; align-items: center; gap: 10px; }
  .party-badge { display: inline-grid; place-items: center; width: 22px; height: 22px; background: var(--party-color); color: #fff; font-family: var(--font-display); font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .party-name { font-size: 13px; color: var(--muted); }
  .bar-cell { padding-right: 20px; width: 30%; }
  .bar-track { height: 16px; position: relative; background: var(--line-soft); overflow: visible; }
  .bar-previous, .bar-current { position: absolute; left: 0; transition: width 0.7s ease; }
  .bar-previous { height: 3px; bottom: 0; background: rgba(255, 255, 255, 0.28); }
  .bar-current { height: 12px; top: 0; }
  .threshold { position: absolute; top: -3px; bottom: -3px; border-left: 1px dashed rgba(255, 255, 255, 0.3); }
  .numeric { text-align: right; padding: 4px 6px; font-variant-numeric: tabular-nums; }
  .share { font-family: var(--font-display); font-size: 20px; font-weight: 700; }
  .change { display: inline-block; font-family: var(--font-display); font-weight: 600; font-size: 13px; white-space: nowrap; }
  .positive { color: var(--green-up); }
  .negative { color: var(--red-bright); }
  .neutral { color: var(--muted); }
  .vote-column { font-size: 12px; color: var(--muted); }
  .exact-share { display: block; color: var(--muted); font-size: 10px; opacity: 0.7; }
  .extra-column { color: var(--muted); font-size: 12px; }
</style>
