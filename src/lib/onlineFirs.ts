// src/lib/onlineFirs.ts
import type { VatsimData } from "./vatsim";
import { normId } from "./norm";

/**
 * We only care about controller positions that represent airspace ownership.
 * (You can add TWR/GND later if you decide to show tower airspace too.)
 */
const ALLOWED_SUFFIXES = new Set(["CTR", "FSS", "APP", "DEP"]);

function norm(cs: string) {
  return String(cs || "").toUpperCase().trim().replaceAll("-", "_");
}

/**
 * Reject junk IDs like decimals ("108.831833") that come from mis-parsing dat files.
 */
function looksLikeBoundaryId(id: string) {
  return /^[A-Z0-9_]{2,20}$/.test(id);
}

/**
 * Turn controller callsign into a list of candidate keys we can try against VATSpy maps.
 * Examples:
 *   WPG_CTR      -> ["WPG"]
 *   LON_SC_CTR   -> ["LON_SC", "LON_SC", "LON"] (deduped later)
 *   YMMM_N_CTR   -> ["YMMM_N", "YMMM_N", "YMMM"]
 */
function candidatesFromCallsign(cs: string): string[] {
  const c = norm(cs);
  const parts = c.split("_").filter(Boolean);
  if (parts.length < 2) return [];

  const suffix = parts[parts.length - 1];
  if (!ALLOWED_SUFFIXES.has(suffix)) return [];

  const noSuffix = parts.slice(0, -1);

  const cands: string[] = [];
  cands.push(noSuffix.join("_")); // full without suffix
  if (noSuffix.length >= 2) cands.push(noSuffix.slice(0, 2).join("_")); // first two tokens
  cands.push(noSuffix[0]); // first token

  // de-dup + normalize
  return Array.from(new Set(cands.map(norm))).filter(Boolean);
}

/**
 * Computes online FIR/sector polygons keyed by GeoJSON boundary id.
 *
 * Flow:
 *  1) Controller callsign -> candidates (e.g. WPG_CTR -> WPG)
 *  2) candidates -> FIR ICAO via VATSpy maps (e.g. WPG -> CZWG)
 *  3) FIR ICAO -> GeoJSON polygon id via fir_boundaries.dat map (e.g. CZWG -> CZQW_... OR MMEX -> MMFR etc)
 *     If fir_boundaries map is missing, we fallback to FIR ICAO directly.
 *
 * Returns:
 *   Map<boundaryId, string[]> where value array is the controller callsigns contributing to that polygon.
 */
export function computeOnlineFirs(
  data: VatsimData,
  maps: {
    boundaryIdByCallsign: Map<string, string>;
    boundaryIdByIcao: Map<string, string>;
  },
  boundaryIdByFirIcao: Map<string, string> | null
) {
  const online = new Map<string, string[]>();

  for (const c of data.controllers ?? []) {
    const cs = norm(c.callsign);
    const cands = candidatesFromCallsign(cs);
    if (!cands.length) continue;

    // Step 1: resolve to FIR ICAO using VATSpy maps
    let firIcao: string | undefined;

    // callsign map (often covers "WPG" -> "CZWG")
    for (const k of cands) {
      const hit = maps.boundaryIdByCallsign.get(normId(k));
      if (hit) {
        firIcao = normId(hit);
        break;
      }
    }

    // ICAO map fallback
    if (!firIcao) {
      for (const k of cands) {
        const hit = maps.boundaryIdByIcao.get(normId(k));
        if (hit) {
          firIcao = normId(hit);
          break;
        }
      }
    }

    if (!firIcao) continue;

    // Step 2: convert FIR ICAO -> boundary polygon id (if we have fir_boundaries map)
    const boundaryId = normId(boundaryIdByFirIcao?.get(firIcao) ?? firIcao);

    // validate BEFORE storing
    if (!looksLikeBoundaryId(boundaryId)) continue;

    const arr = online.get(boundaryId) ?? [];
    arr.push(cs);
    online.set(boundaryId, arr);
  }

  return online;
}
