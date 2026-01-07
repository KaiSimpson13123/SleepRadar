import { useEffect, useMemo, useRef, useState } from "react";
import Shell from "./components/Shell";
import CidGate from "./components/CidGate";
import TopBar from "./components/TopBar";
import ModeToggle, { Mode } from "./components/ModeToggle";
import StatCards from "./components/StatCards";
import LiveMap from "./components/LiveMap";
import ZoneCard from "./components/ZoneCard";
import {
  fetchVatsimData,
  findPilotByCid,
  type VatsimPilot,
} from "./lib/vatsim";
import { fetchBoundaries, type BoundariesFC } from "./lib/boundaries";
import { findZoneForPoint, type ZoneHit } from "./lib/zone";
import type { Feature, Geometry, GeoJsonProperties } from "geojson";
import { fetchVatSpyDat, parseFirMaps } from "./lib/vatspyDat";
import { computeOnlineFirs } from "./lib/onlineFirs";
import { closeGeoJsonRings } from "./lib/geojsonFix";
import {
  fetchFirBoundariesDat,
  parseFirBoundariesDat,
} from "./lib/firBoundariesDat";
import AlarmModal from "./components/AlarmModal";
import { startAlarm, stopAlarm } from "./lib/alarm";

declare global {
  interface Window {
    SleepRadar?: {
      getCid: () => Promise<string>;
      setCid: (cid: string) => Promise<string>;

      getMapData: () => Promise<{
        current_commit_hash: string;
        fir_boundaries_dat_url: string;
        fir_boundaries_geojson_url: string;
        vatspy_dat_url: string;
      }>;
      fetchText: (url: string) => Promise<string>;
      fetchJson: <T = any>(url: string) => Promise<T>;
    };
  }
}

export default function App() {
  const [cid, setCid] = useState("");
  const [mode, setMode] = useState<Mode>("standby");

  const [boundaries, setBoundaries] = useState<BoundariesFC | null>(null);

  const [pilot, setPilot] = useState<VatsimPilot | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [insideOnlineId, setInsideOnlineId] = useState<string | null>(null);

  const [firMaps, setFirMaps] = useState<{
    boundaryIdByCallsign: Map<string, string>;
    boundaryIdByIcao: Map<string, string>;
  } | null>(null);

  const [onlineFirs, setOnlineFirs] = useState<Map<string, string[]>>(
    new Map()
  );

  const [boundaryIdByFirIcao, setBoundaryIdByFirIcao] = useState<Map<
    string,
    string
  > | null>(null);

  const [zone, setZone] = useState<ZoneHit | null>(null);
  const [zoneFeature, setZoneFeature] = useState<Feature<
    Geometry,
    GeoJsonProperties
  > | null>(null);

  const [alarmOpen, setAlarmOpen] = useState(false);
  const [alarmMsg, setAlarmMsg] = useState<{
    title: string;
    subtitle?: string;
  } | null>(null);
  const lastAlarmRef = useRef<number>(0);
  const lastAlarmBoundaryRef = useRef<string | null>(null);

  const ALARM_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

  const hasCid = cid.trim().length > 0;

  // Load CID (persisted)
  useEffect(() => {
    (async () => {
      try {
        const saved = await window.SleepRadar?.getCid?.();
        if (saved) setCid(saved);
      } catch {
        // fallback if preload missing (still works in dev if needed)
        const local = localStorage.getItem("cid") || "";
        if (local) setCid(local);
      }
    })();
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    fetchFirBoundariesDat()
      .then((txt) => {
        const m = parseFirBoundariesDat(txt);
        setBoundaryIdByFirIcao(m.boundaryIdByFirIcao);
        console.log("FIR->Boundary map size:", m.boundaryIdByFirIcao.size);
        console.log("MMEX maps to:", m.boundaryIdByFirIcao.get("MMEX"));
      })
      .catch((e: any) => {
        if (e?.name === "AbortError") return;
        const msg = String(e?.message || "");
        if (msg.toLowerCase().includes("aborted")) return;
        setErr(msg || "Failed to load fir_boundaries.dat");
      });

    return () => ac.abort();
  }, []);

  // Load boundaries once
  useEffect(() => {
    const ac = new AbortController();

    fetchBoundaries(ac.signal)
      .then((fc) => setBoundaries(closeGeoJsonRings(fc)))
      .catch((e: any) => {
        // ✅ React dev StrictMode will abort the first run — ignore it
        if (e?.name === "AbortError") return;
        const msg = String(e?.message || "");
        if (msg.toLowerCase().includes("aborted")) return;

        setErr(msg || "Failed to load boundaries");
      });

    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    fetchVatSpyDat(ac.signal)
      .then((txt) => {
        const maps = parseFirMaps(txt);
        console.log(
          "VATSpy FIR callsigns parsed:",
          maps.boundaryIdByCallsign.size
        );
        console.log(
          "Sample FIR callsigns:",
          Array.from(maps.boundaryIdByCallsign.keys()).slice(0, 20)
        );
        setFirMaps(maps);
      })

      .catch((e: any) => {
        if (e?.name === "AbortError") return;
        const msg = String(e?.message || "");
        if (msg.toLowerCase().includes("aborted")) return;
        setErr(msg || "Failed to load VATSpy.dat");
      });

    return () => ac.abort();
  }, []);

  const center = useMemo(() => {
    if (!pilot) return { lat: -31.95, lon: 115.86 }; // Perth default (nice for you)
    return { lat: pilot.latitude, lon: pilot.longitude };
  }, [pilot]);

  function stopPolling() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;

    abortRef.current?.abort();
    abortRef.current = null;

    setLoading(false);
  }

  async function tick() {
    if (!hasCid) return;

    // don’t show an error while we’re intentionally swapping requests
    setErr(null);
    setLoading(true);

    // abort previous request (this is normal)
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const data = await fetchVatsimData(ac.signal);
      setLastUpdate(data.general.update_timestamp);

      console.log("VATSIM keys:", Object.keys(data));

      const me = findPilotByCid(data, cid);
      setPilot(me);

      let insideId: string | null = null;

      if (me && boundaries) {
        const zr = findZoneForPoint(boundaries, me.longitude, me.latitude);
        setZone(zr?.hit ?? null);
        setZoneFeature(zr?.feature ?? null);

        insideId =
          String((zr?.feature?.properties as any)?.id || "")
            .trim()
            .toUpperCase()
            .replaceAll("-", "_") || null;
      } else {
        setZone(null);
        setZoneFeature(null);
        insideId = null;
      }

      if (firMaps) {
        // ✅ pass boundaryIdByFirIcao so FIR ICAO -> polygon id works (MMEX -> MMFR)
        const m = computeOnlineFirs(data, firMaps, boundaryIdByFirIcao);
        setOnlineFirs(m);

        // ✅ green only when inside AND online
        if (insideId && m.has(insideId)) setInsideOnlineId(insideId);
        else setInsideOnlineId(null);

        console.log("INSIDE ID:", insideId);
        console.log("ONLINE HAS INSIDE:", insideId ? m.has(insideId) : null);
        console.log("ONLINE KEYS SAMPLE:", Array.from(m.keys()).slice(0, 25));
      } else {
        setOnlineFirs(new Map());
        setInsideOnlineId(null);
      }
    } catch (e: any) {
      // ✅ ignore abort noise completely
      if (e?.name === "AbortError") return;

      // Some environments throw a DOMException with message like "signal is aborted..."
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("aborted")) return;

      setErr(msg || "Update failed");
    } finally {
      // If this request was aborted, don’t flicker loading state
      if (!ac.signal.aborted) setLoading(false);
    }
  }

  const mapsReady = !!firMaps;
  const firToBoundaryReady = !!boundaryIdByFirIcao;

  // Start/stop polling based on mode
  useEffect(() => {
    stopPolling();
    setPilot(null);
    setZone(null);

    if (
      mode === "active" &&
      hasCid &&
      boundaries &&
      mapsReady &&
      firToBoundaryReady
    ) {
      tick();
      timerRef.current = window.setInterval(tick, 10000);
    }

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cid, hasCid, boundaries, mapsReady, firToBoundaryReady]);

  async function saveCid(next: string) {
    const clean = next.trim();
    setCid(clean);

    try {
      await window.SleepRadar?.setCid?.(clean);
    } catch {
      localStorage.setItem("cid", clean);
    }
  }

  useEffect(() => {
    // Trigger only when we enter an inside+online boundary
    if (!insideOnlineId) return;

    const now = Date.now();
    const changedBoundary = lastAlarmBoundaryRef.current !== insideOnlineId;
    const cooldownPassed = now - lastAlarmRef.current > ALARM_COOLDOWN_MS;

    if (!alarmOpen && (changedBoundary || cooldownPassed)) {
      lastAlarmRef.current = now;
      lastAlarmBoundaryRef.current = insideOnlineId;

      const title = `Control zone online: ${insideOnlineId}`;
      const subtitle = `You are inside ${insideOnlineId} and it's currently staffed. Get back to the PC.`;

      setAlarmMsg({ title, subtitle });
      setAlarmOpen(true);

      // Start alarm sound (use your asset path)
      startAlarm(new URL("./assets/alarm.wav", import.meta.url).toString());

      // Flash the window if available
      try {
        (window as any).SleepRadar?.flash?.();
      } catch {}
    }
  }, [insideOnlineId, alarmOpen]);

  function dismissAlarm() {
    setAlarmOpen(false);
    setAlarmMsg(null);
    stopAlarm();

    // prevent immediate retrigger while still inside (forces "edge" behavior)
    // You can allow retrigger only after leaving the zone OR cooldown.
    lastAlarmBoundaryRef.current = insideOnlineId;
    lastAlarmRef.current = Date.now();
  }

  return (
    <Shell>
      <TopBar
        title="SleepRadar"
        subtitle={
          mode === "active" ? "Tracking live VATSIM position" : "Standing by"
        }
        loading={loading}
        error={err}
        lastUpdate={lastUpdate}
      />

      {!hasCid ? (
        <CidGate onSave={saveCid} />
      ) : (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-xs text-white/60">VATSIM CID</div>
                <div className="font-semibold tracking-wide">{cid}</div>
              </div>

              <button
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={() => saveCid("")}
                title="Change CID"
              >
                Change
              </button>
            </div>

            <ModeToggle mode={mode} setMode={setMode} />
          </div>

          <div className="col-span-12 lg:col-span-7 h-[520px]">
            <LiveMap
              mode={mode}
              pilot={pilot}
              center={center}
              zone={zone}
              zoneFeature={zoneFeature}
              boundaries={boundaries}
              onlineFirs={onlineFirs}
              insideOnlineId={insideOnlineId}
            />
          </div>

          <div className="col-span-12 lg:col-span-5 space-y-4">
            <StatCards mode={mode} pilot={pilot} />
            <ZoneCard mode={mode} pilot={pilot} zone={zone} />
          </div>
        </div>
      )}
      <AlarmModal
        open={alarmOpen}
        title={alarmMsg?.title || "Alert"}
        subtitle={alarmMsg?.subtitle || null}
        onAcknowledge={() => {
          // helps if autoplay was blocked; clicking modal will attempt play again
          startAlarm(new URL("./assets/alarm.wav", import.meta.url).toString());
        }}
        onDismiss={dismissAlarm}
      />
    </Shell>
  );
}
