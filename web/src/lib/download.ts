import { analytics } from './analytics.svelte.ts';

export function download(body: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (filename.endsWith('.csv')) analytics.track('export_csv');
  if (filename.endsWith('.json') && !filename.includes('anvandningsstatistik')) analytics.track('export_json');
}
