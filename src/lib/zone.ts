import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";

export type ZoneHit = {
  id: string;
  region?: string;
  division?: string;
  oceanic?: string;
};

export type ZoneResult = {
  hit: ZoneHit;
  feature: Feature<Geometry, GeoJsonProperties>;
};

export function findZoneForPoint(
  boundaries: FeatureCollection<Geometry, GeoJsonProperties>,
  lon: number,
  lat: number
): ZoneResult | null {
  const pt = turf.point([lon, lat]);

  for (const f of boundaries.features) {
    if (!f?.geometry) continue;

    // supports Polygon + MultiPolygon
    const ok = turf.booleanPointInPolygon(pt, f as any);
    if (!ok) continue;

    const props: any = f.properties || {};
    return {
      hit: {
        id: String(props.id || "UNKNOWN"),
        region: props.region ? String(props.region) : undefined,
        division: props.division ? String(props.division) : undefined,
        oceanic: props.oceanic ? String(props.oceanic) : undefined
      },
      feature: f
    };
  }

  return null;
}
