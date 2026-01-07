import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { VatsimPilot } from "../lib/vatsim";
import type { ZoneHit } from "../lib/zone";
import type { Mode } from "./ModeToggle";
import type {
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
  Feature,
} from "geojson";
import { useEffect, useMemo, useRef } from "react";
import type { GeoJSON as LeafletGeoJSON } from "leaflet";
import { normId } from "../lib/norm";
import { Pane } from "react-leaflet";

function FollowCamera({ pilot }: { pilot: VatsimPilot | null }) {
  const map = useMap();

  useEffect(() => {
    if (!pilot) return;

    // Follow the aircraft smoothly
    map.flyTo([pilot.latitude, pilot.longitude], 3, {
      animate: true,
      duration: 0.8,
    });
  }, [pilot?.latitude, pilot?.longitude]); // follow position changes

  return null;
}

function makePlaneIcon(headingDeg: number) {
  // simple SVG “paper plane” style marker that rotates with heading
  // VATSIM heading: 0 = North. Our SVG points East by default.
  // So subtract 90° to align SVG nose with North-based headings.
  const h0 = Number.isFinite(headingDeg) ? headingDeg : 0;
  const h = h0 - 90;

  return L.divIcon({
    className: "plane-marker",
    html: `
      <div style="
        width: 38px; height: 38px;
        transform: rotate(${h}deg);
        transform-origin: 50% 50%;
        filter: drop-shadow(0 8px 18px rgba(0,0,0,0.55));
      ">
        <svg viewBox="0 0 24 24" width="38" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12L3 20l4-8-4-8 18 8Z" fill="rgba(255,255,255,0.92)"/>
          <path d="M21 12L7 12" stroke="rgba(0,0,0,0.35)" stroke-width="1.2" />
        </svg>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

export default function LiveMap({
  mode,
  pilot,
  center,
  zone,
  zoneFeature,
  boundaries,
  onlineFirs,
  insideOnlineId,
}: {
  mode: Mode;
  pilot: VatsimPilot | null;
  center: { lat: number; lon: number };
  zone: ZoneHit | null;
  zoneFeature: Feature<Geometry, GeoJsonProperties> | null;
  boundaries: FeatureCollection<Geometry, GeoJsonProperties> | null;
  onlineFirs: Map<string, string[]>;
  insideOnlineId: string | null;
}) {
  const pos: [number, number] = [center.lat, center.lon];

  const geoRef = useRef<LeafletGeoJSON | null>(null);

  const planeIcon = useMemo(() => {
    return makePlaneIcon(pilot?.heading ?? 0);
  }, [pilot?.heading]);

  const currentId = (zoneFeature?.properties as any)?.id as string | undefined;

  const layerByIdRef = useRef<Map<string, L.Layer>>(new Map());

  useEffect(() => {
    const gj: any = geoRef.current;
    if (!gj || !currentId) return;

    gj.eachLayer((layer: any) => {
      const id = String(layer?.feature?.properties?.id || "");
      if (id === currentId && typeof layer.bringToFront === "function") {
        layer.bringToFront();
      }
    });
  }, [currentId]);

  const baseBoundaryStyle = (feature: any) => {
    const id = String(feature?.properties?.id || "");
    const isOnline = onlineFirs.has(id);
    const isInsideOnline = insideOnlineId && id === insideOnlineId;

    if (isInsideOnline) {
      return {
        color: "#22c55e",
        weight: 2.5,
        fillColor: "#22c55e",
        fillOpacity: 0.1,
      };
    }
    if (isOnline) {
      return {
        color: "#60a5fa",
        weight: 1.6,
        fillColor: "#60a5fa",
        fillOpacity: 0.06,
      };
    }
    // offline
    return {
      color: "rgba(148,163,184,0.45)",
      weight: 1,
      fillColor: "rgba(148,163,184,0.12)",
      fillOpacity: 0.03,
    };
  };

  useEffect(() => {
    if (!insideOnlineId) return;

    const layer = layerByIdRef.current.get(insideOnlineId);
    if (!layer) return;

    // ✅ guard: bringToFront exists only on Path layers
    const anyLayer: any = layer;
    if (typeof anyLayer.bringToFront === "function") {
      anyLayer.bringToFront();
    }
  }, [insideOnlineId]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 shadow-glow overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="text-sm font-semibold">Live Map</div>
        <div className="text-xs text-white/55">
          {mode === "active" ? (pilot ? "Following" : "Searching…") : "Standby"}
        </div>
      </div>

      <div className="h-[calc(100%-48px)]">
        <MapContainer
          center={pos}
          zoom={pilot ? 5 : 3}
          scrollWheelZoom={true}
          worldCopyJump={false}
          maxBounds={[
            [-85, -180],
            [85, 180],
          ]}
          maxBoundsViscosity={1.0}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
            noWrap={true}
          />

          {/* Follow camera when pilot moves */}
          <FollowCamera pilot={pilot} />

          {/* Base boundaries (grey/blue) */}
          <Pane name="boundaries" style={{ zIndex: 410 }}>
            {boundaries ? (
              <GeoJSON
                data={boundaries as any}
                pane="boundaries"
                style={(f: any) => {
                  const id = normId(f?.properties?.id);
                  const isOnline = onlineFirs.has(id);

                  if (isOnline) {
                    return {
                      color: "#60a5fa",
                      weight: 1.6,
                      fillColor: "#60a5fa",
                      fillOpacity: 0.06,
                    };
                  }

                  return {
                    color: "rgba(148,163,184,0.45)",
                    weight: 1,
                    fillColor: "rgba(148,163,184,0.12)",
                    fillOpacity: 0.03,
                  };
                }}
              />
            ) : null}
          </Pane>

          {/* Highlight current boundary (GREEN) — separate layer, always on top */}
          <Pane name="highlight" style={{ zIndex: 430 }}>
            {zoneFeature &&
            insideOnlineId &&
            normId((zoneFeature.properties as any)?.id) === insideOnlineId ? (
              <GeoJSON
                data={zoneFeature as any}
                pane="highlight"
                style={() => ({
                  color: "#22c55e",
                  weight: 3,
                  fillColor: "#22c55e",
                  fillOpacity: 0.12,
                })}
              />
            ) : null}
          </Pane>

          {pilot ? (
            <Marker
              position={[pilot.latitude, pilot.longitude]}
              icon={planeIcon}
            >
              <Popup>
                <div style={{ minWidth: 190 }}>
                  <div style={{ fontWeight: 700 }}>{pilot.callsign}</div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>
                    Zone: <b>{zone?.id || "—"}</b>
                  </div>
                  <div style={{ opacity: 0.85, marginTop: 6 }}>
                    {pilot.altitude} ft • {pilot.groundspeed} kt • hdg{" "}
                    {pilot.heading}°
                  </div>
                </div>
              </Popup>
            </Marker>
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}
