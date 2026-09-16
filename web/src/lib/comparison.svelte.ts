const STORAGE_KEY = 'val2026-comparison-area';

function storedArea() {
  if (typeof localStorage === 'undefined') return '';
  try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
}

function createComparison() {
  let area = $state(storedArea());

  function setArea(value: string) {
    area = value;
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Comparison remains usable when storage is unavailable.
    }
  }

  return {
    get area() { return area; },
    setArea,
    clear: () => setArea(''),
  };
}

export const comparison = createComparison();
