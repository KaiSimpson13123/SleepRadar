import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import { fetchMapData } from "./mapData";

export type BoundariesFC = FeatureCollection<Geometry, GeoJsonProperties>;

export async function fetchBoundaries(_signal?: AbortSignal): Promise<BoundariesFC> {
  const md = await fetchMapData();
  const api = window.SleepRadar;
  if (!api?.fetchJson) throw new Error("SleepRadar.fetchJson missing");

  return api.fetchJson<BoundariesFC>(md.fir_boundaries_geojson_url);
}
