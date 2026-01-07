export type MapDataList = {
  current_commit_hash: string;
  fir_boundaries_dat_url: string;
  fir_boundaries_geojson_url: string;
  vatspy_dat_url: string;
};

export async function getMapDataList(signal?: AbortSignal): Promise<MapDataList> {
  const r = await fetch("https://api.vatsim.net/api/map_data/", { signal });
  if (!r.ok) throw new Error(`map_data fetch failed: ${r.status}`);
  return r.json();
}

export async function fetchText(url: string, signal?: AbortSignal) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`fetch failed ${r.status}: ${url}`);
  return r.text();
}

export async function fetchJson<T>(url: string, signal?: AbortSignal) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`fetch failed ${r.status}: ${url}`);
  return r.json() as Promise<T>;
}
