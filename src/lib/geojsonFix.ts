import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";

type Pos = [number, number] | [number, number, number];

function samePos(a: Pos, b: Pos) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function closeRing(ring: Pos[]) {
  if (!ring || ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!samePos(first, last)) return [...ring, first];
  return ring;
}

/**
 * Returns a deep-copied FC where any Polygon/MultiPolygon rings are closed.
 * Safe to run once on load.
 */
export function closeGeoJsonRings<
  G extends Geometry = Geometry,
  P extends GeoJsonProperties = GeoJsonProperties
>(fc: FeatureCollection<G, P>): FeatureCollection<G, P> {
  return {
    ...fc,
    features: fc.features.map((f: any) => {
      const g = f.geometry;
      if (!g) return f;

      if (g.type === "Polygon") {
        const coords = (g.coordinates as Pos[][]).map(closeRing);
        return { ...f, geometry: { ...g, coordinates: coords } };
      }

      if (g.type === "MultiPolygon") {
        const coords = (g.coordinates as Pos[][][]).map((poly) =>
          poly.map(closeRing)
        );
        return { ...f, geometry: { ...g, coordinates: coords } };
      }

      return f;
    }),
  };
}
