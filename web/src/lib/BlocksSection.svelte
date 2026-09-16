<script lang="ts">
  import { currentView } from './currentView.svelte.ts';
  import { blockResults, colors } from './model.ts';
  import { flash } from './flash.ts';

  const number = new Intl.NumberFormat('sv-SE');
  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (value: number | null) => (value == null ? '—' : `${decimal.format(value)} %`);
  const deltaText = (value: number | null) => (value == null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${decimal.format(Math.abs(value))}`);

  const blocks = $derived(blockResults(currentView.area));
  const left = $derived(blocks[0]);
  const right = $derived(blocks[1]);
  const other = $derived(left?.share != null && right?.share != null ? Math.max(0, 100 - left.share - right.share) : null);
</script>

<section class="blocks-section">
  <div class="section-top">
    <h2>Blocken</h2>
  </div>
  <div class="block-cards">
    {#each blocks as block (block.key)}
      <article class="block-card block-{block.key}">
        <div class="block-card-heading">
          <h3>{block.label}</h3>
          <span>{block.parties.join(' + ')}</span>
        </div>
        <div class="block-metric">
          <strong use:flash={{ value: pct(block.share), version: currentView.data }}>{pct(block.share)}</strong>
          <span class="subtle">{number.format(block.votes ?? 0)} röster</span>
        </div>
        <div class="block-members">
          {#each block.parties as key, index (key)}
            <span class="member">
              <span class="mini-badge" style="--party-color: {colors[key] || '#92958c'}">{key}</span>
              {pct(block.members[index]?.andelRoster ?? null)}
            </span>
          {/each}
        </div>
        <p class="subtle">{block.delta == null ? 'Jämförelse med 2022 saknas' : `${deltaText(block.delta)} procentenheter mot 2022`}</p>
      </article>
    {/each}
  </div>
  {#if left?.share != null && right?.share != null}
    <div class="block-bar" role="img" aria-label="Vänster {pct(left.share)}, övriga {pct(other)}, höger {pct(right.share)}">
      <span class="balance-left" style="width: {left.share}%" title="Vänster: {pct(left.share)}"></span>
      <span class="balance-other" style="width: {other}%" title="Övriga: {pct(other)}"></span>
      <span class="balance-right" style="width: {right.share}%" title="Höger: {pct(right.share)}"></span>
    </div>
  {:else}
    <p class="subtle">Inväntar fullständiga partiuppgifter för blockjämförelsen.</p>
  {/if}
</section>

<style>
  .blocks-section { background: #fff; border: 1px solid #e5e6df; border-radius: 10px; padding: 22px 24px; margin-bottom: 24px; }
  .section-top { margin-bottom: 16px; }
  h2 { font-family: Manrope, sans-serif; font-size: 20px; font-weight: 650; margin: 0; }
  .subtle { font-size: 10px; color: #8b9085; }
  .block-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .block-card { padding: 16px 18px; border-radius: 8px; background: #fbf5f2; border-top: 3px solid #d47768; }
  .block-card.block-right { background: #f2f6f9; border-top-color: #6595b8; }
  .block-card-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .block-card-heading h3 { font-size: 14px; margin: 0; }
  .block-card-heading span { font-size: 10px; color: #8b9285; }
  .block-metric { display: flex; align-items: baseline; gap: 12px; margin: 10px 0; }
  .block-metric strong { font-size: 28px; font-family: Manrope, sans-serif; font-weight: 650; }
  .block-members { display: flex; gap: 10px; flex-wrap: wrap; font-size: 10px; color: #6b7264; }
  .member { display: flex; align-items: center; gap: 4px; }
  .mini-badge { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 4px; background: color-mix(in srgb, var(--party-color) 15%, white); color: var(--party-color); font-size: 8px; font-weight: 700; }
  .block-bar { display: flex; height: 16px; border-radius: 5px; overflow: hidden; margin-top: 8px; background: #edf0e7; }
  .balance-left { background: #d47768; }
  .balance-right { background: #6595b8; }
  .balance-other { background: #dbddd5; }
</style>
