export type ComparisonMode = 'previous' | 'national' | 'none';
export type SortMode = 'votes' | 'name' | 'change';
export type ThresholdMode = 'all' | 'above' | 'below';

// View-only state: switching any of these re-renders the same underlying
// data, so it must never trigger the change-flash effect (see flash.ts).
function createFilters() {
  let area = $state('');
  let selected = $state<string[]>([]);
  let comparisonMode = $state<ComparisonMode>('previous');
  let sort = $state<SortMode>('votes');
  let threshold = $state<ThresholdMode>('all');
  let query = $state('');
  let detailsExpanded = $state(false);

  function toggleParty(key: string) {
    selected = selected.includes(key) ? selected.filter(item => item !== key) : [...selected, key];
  }
  function reset() {
    area = ''; selected = []; comparisonMode = 'previous'; sort = 'votes'; threshold = 'all'; query = ''; detailsExpanded = false;
  }

  return {
    get area() { return area; }, set area(value: string) { area = value; },
    get selected() { return selected; },
    toggleParty,
    get comparisonMode() { return comparisonMode; }, set comparisonMode(value: ComparisonMode) { comparisonMode = value; },
    get sort() { return sort; }, set sort(value: SortMode) { sort = value; },
    get threshold() { return threshold; }, set threshold(value: ThresholdMode) { threshold = value; },
    get query() { return query; }, set query(value: string) { query = value; },
    get detailsExpanded() { return detailsExpanded; }, set detailsExpanded(value: boolean) { detailsExpanded = value; },
    reset,
  };
}

export const filters = createFilters();
