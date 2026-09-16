<script lang="ts">
  import { currentView } from './currentView.svelte.ts';
  import { blockResults, colors } from './model.ts';
  import { tween } from './tween.ts';

  const number = new Intl.NumberFormat('sv-SE');
  const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (value: number | null | undefined) => (value == null ? '—' : `${decimal.format(value)} %`);
  const fmt = (value: number | null | undefined) => (value == null ? '—' : number.format(value));
  const deltaText = (value: number | null) => (value == null ? '—' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${decimal.format(Math.abs(value))}`);

  const blocks = $derived(blockResults(currentView.area));
  const left = $derived(blocks.find(b => b.key === 'left'));
  const right = $derived(blocks.find(b => b.key === 'right'));
  const voteMargin = $derived.by(() => {
    if (left?.votes == null || right?.votes == null) return null;
    const diff = left.votes - right.votes;
    return { diff: Math.abs(diff), leader: diff === 0 ? null : diff > 0 ? left : right };
  });
</script>

<section class="blocks-section">
  <div class="section-top">
    <h2>Blocken</h2>
  </div>
  {#if voteMargin}
    <div class="vote-margin" style="--accent: {voteMargin.leader ? (voteMargin.leader.key === 'left' ? 'var(--red)' : '#2f5fa8') : 'var(--muted)'}">
      <span class="vote-margin-figure" use:tween={{ value: voteMargin.diff, format: fmt, version: currentView.data }}></span>
      <span class="vote-margin-caption">
        {#if voteMargin.leader}
          röster mer för <strong>{voteMargin.leader.label.toUpperCase()}</strong>
        {:else}
          Blocken har exakt lika många röster
        {/if}
      </span>
    </div>
  {/if}
  <div class="block-cards">
    {#each blocks as block (block.key)}
      <article class="block-card block-{block.key}">
        <div class="block-card-heading">
          <h3>{block.label}</h3>
          <span>{block.parties.join(' + ')}</span>
        </div>
        <div class="block-metric">
          <strong use:tween={{ value: block.share, format: pct, version: currentView.data }}></strong>
          <span class="subtle">{number.format(block.votes ?? 0)} röster</span>
        </div>
        <div class="block-members">
          {#each block.parties as key, index (key)}
            <span class="member">
              <span class="mini-badge" style="background: {colors[key] || '#92958c'}">{key}</span>
              {pct(block.members[index]?.andelRoster ?? null)}
            </span>
          {/each}
        </div>
        <p class="subtle">{block.delta == null ? 'Jämförelse med 2022 saknas' : `${deltaText(block.delta)} procentenheter mot 2022`}</p>
      </article>
    {/each}
  </div>
</section>

<style>
  .blocks-section { margin-bottom: 32px; }
  .section-top { margin-bottom: 16px; }
  h2 { font-size: 22px; font-weight: 700; letter-spacing: 0.3px; }
  .vote-margin { display: flex; align-items: baseline; gap: 14px; padding: 12px 18px; margin-bottom: 20px; border-left: 4px solid var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
  .vote-margin-figure { font-family: var(--font-display); font-size: 32px; font-weight: 800; color: var(--accent); line-height: 1; }
  .vote-margin-caption { font-family: var(--font-display); font-size: 13px; letter-spacing: 0.4px; color: var(--muted); }
  .vote-margin-caption strong { color: var(--text); letter-spacing: 1px; }
  .subtle { font-size: 11px; color: var(--muted); }
  .block-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--line); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .block-card { padding: 18px 20px; background: var(--bg); border-top: 3px solid var(--red); }
  .block-card.block-right { border-top-color: #2f5fa8; }
  .block-card-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .block-card-heading h3 { font-family: var(--font-display); font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase; }
  .block-card-heading span { font-size: 11px; color: var(--muted); }
  .block-metric { display: flex; align-items: baseline; gap: 12px; margin: 10px 0; }
  .block-metric strong { font-family: var(--font-display); font-size: 34px; font-weight: 700; }
  .block-members { display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: var(--muted); }
  .member { display: flex; align-items: center; gap: 5px; }
  .mini-badge { display: inline-grid; place-items: center; width: 16px; height: 16px; color: #fff; font-family: var(--font-display); font-size: 9px; font-weight: 700; }
</style>
