export type VatsimMapData = {
  current_commit_hash: string;
  fir_boundaries_dat_url: string;
  fir_boundaries_geojson_url: string;
  vatspy_dat_url: string;
};

export async function fetchMapData(): Promise<VatsimMapData> {
  const api = window.SleepRadar;
  if (!api?.getMapData) throw new Error("SleepRadar.getMapData missing (preload not loaded)");
  return api.getMapData();
}
