import type { GeographyRegion } from './types.ts';

function createGeography() {
  let regions = $state<GeographyRegion[]>([]);

  fetch('/geography.json')
    .then(response => response.json())
    .then((value: GeographyRegion[]) => { regions = value; })
    .catch(() => {});

  return {
    get regions() { return regions; },
  };
}

export const geography = createGeography();
