<script lang="ts">
  import { currentView } from './currentView.svelte.ts';
  import { filters } from './filters.svelte.ts';
  import { historyStore } from './historyStore.svelte.ts';
  import { trends } from './trends.svelte.ts';
  import { partiesFor, partyKey, partyName, filterParties, selectionTotal } from './model.ts';

  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const changeDecimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const number = new Intl.NumberFormat('sv-SE');
  const pct = (value: number | null | undefined) => (value == null ? '—' : `${decimal.format(value)} %`);
  const fmt = (value: number | null | undefined) => (value == null ? '—' : number.format(value));

  const parties = $derived(partiesFor(currentView.area));
  const leader = $derived([...parties].filter(p => p.antalRoster > 0).sort((a, b) => b.antalRoster - a.antalRoster)[0]);

  const currentId = $derived(historyStore.replayMode ? historyStore.entries[historyStore.replayIndex]?.id : historyStore.entries.at(-1)?.id);
  const currentTrendIndex = $derived(trends.points.findIndex(point => point.id === currentId));
  const previousTrend = $derived(currentTrendIndex > 0 ? trends.points[currentTrendIndex - 1] : null);
  const currentTrend = $derived(currentTrendIndex >= 0 ? trends.points[currentTrendIndex] : null);
  const moves = $derived(
    parties
      .map(p => {
        const key = partyKey(p);
        const delta = currentTrend?.shares?.[key] != null && previousTrend?.shares?.[key] != null ? currentTrend.shares[key] - previousTrend.shares[key] : null;
        return { p, delta };
      })
      .filter((item): item is { p: (typeof parties)[number]; delta: number } => item.delta != null)
  );
  const gain = $derived([...moves].sort((a, b) => b.delta - a.delta)[0]);
  const loss = $derived([...moves].sort((a, b) => a.delta - b.delta)[0]);

  const chosen = $derived(filterParties(parties, { selected: filters.selected }));
  const selectionShare = $derived(filters.selected.length ? selectionTotal(chosen, currentView.area?.rosterPaverkaMandat?.antalRoster) : null);
</script>

<section class="insights" aria-label="Resultatet i fokus">
  <article>
    <span>STÖRST JUST NU</span>
    <strong>{leader ? `${partyKey(leader)} · ${pct(leader.andelRoster)}` : 'Inväntar röster'}</strong>
    <p>{leader ? `${partyName(leader)} · ${fmt(leader.antalRoster)} röster` : 'Inga redovisade röster vid denna tidpunkt.'}</p>
  </article>
  <article>
    <span>STÖRST PARTIFÖRÄNDRING</span>
    <strong>
      {#if gain || loss}
        {gain ? `${partyKey(gain.p)} +${changeDecimal.format(gain.delta)}` : '—'} / {loss ? `${partyKey(loss.p)} −${changeDecimal.format(Math.abs(loss.delta))}` : '—'} pp
      {:else}
        Inväntar uppdatering
      {/if}
    </strong>
    <p>
      {#if gain || loss}
        {gain ? `Störst upp: ${partyName(gain.p)}` : ''}{gain && loss ? ' · ' : ''}{loss ? `Störst ner: ${partyName(loss.p)}` : ''} · sedan senaste uppdateringen
      {:else}
        Förändring visas när två sparade observationer finns.
      {/if}
    </p>
  </article>
  <article>
    <span>DITT URVAL</span>
    <strong>{filters.selected.length ? pct(selectionShare) : 'Alla partier'}</strong>
    <p>{filters.selected.length ? `${filters.selected.join(' + ')} · ${fmt(chosen.reduce((sum, p) => sum + (p.antalRoster || 0), 0))} röster. Andel av områdets giltiga röster, inte en mandatberäkning.` : 'Välj partier ovan för att summera deras röstandelar.'}</p>
  </article>
</section>

<style>
  .insights { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); margin-bottom: 44px; }
  article { background: var(--panel); padding: 18px; }
  article > span { font-family: var(--font-display); font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); }
  strong { display: block; font-family: var(--font-display); font-size: 24px; letter-spacing: -0.3px; margin-top: 8px; font-weight: 700; color: var(--text); }
  p { color: var(--muted); font-size: 11px; line-height: 1.7; margin: 6px 0 0; }
</style>
