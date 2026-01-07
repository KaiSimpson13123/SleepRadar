import type { VatsimData } from "./vatsim";
import { normId } from "./norm";

const ALLOWED_SUFFIXES = new Set(["CTR", "FSS", "APP", "DEP"]);

function norm(cs: string) {
  return String(cs || "")
    .toUpperCase()
    .trim()
    .replaceAll("-", "_");
}

function extractExtendedSectors(textLines: string[]): string[] {
  const out: string[] = [];

  for (const line of textLines || []) {
    const s = line.toUpperCase();

    // Match things like: GUN 128.4, MUN 132.6, WOL 125.0
    const matches = s.match(/\b[A-Z]{2,5}\b/g);
    if (!matches) continue;

    for (const m of matches) {
      // Filter obvious junk words
      if (["EXTENDING", "AND", "WITH", "ON", "THE"].includes(m)) continue;
      out.push(m);
    }
  }

  return Array.from(new Set(out));
}


function candidatesFromCallsign(cs: string): string[] {
  const c = norm(cs);
  const parts = c.split("_").filter(Boolean);
  if (parts.length < 2) return [];

  const suffix = parts[parts.length - 1];
  if (!ALLOWED_SUFFIXES.has(suffix)) return [];

  const noSuffix = parts.slice(0, -1); // everything before CTR/FSS/APP/DEP

  const cands: string[] = [];

  // Try full without suffix: YMMM_N, LON_SC, etc.
  cands.push(noSuffix.join("_"));

  // Try first two tokens: LON_SC from LON_SC_CTR
  if (noSuffix.length >= 2) cands.push(noSuffix.slice(0, 2).join("_"));

  // Try first token: WPG from WPG_CTR
  cands.push(noSuffix[0]);

  // De-dup
  return Array.from(new Set(cands.map(norm))).filter(Boolean);
}

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

    let boundaryId: string | undefined;

    // First try fir_boundaries.dat mapping (this makes MMEX -> MMFR work)
    if (boundaryIdByFirIcao) {
      for (const k of cands) {
        const hit = boundaryIdByFirIcao.get(normId(k));
        if (hit) {
          boundaryId = normId(hit);
          break;
        }
      }
    }

    // Fallback to VATSpy maps (your existing logic)
    if (!boundaryId) {
      for (const k of cands) {
        const hit = maps.boundaryIdByCallsign.get(normId(k));
        if (hit) {
          boundaryId = normId(hit);
          break;
        }
      }
    }

    if (!boundaryId) {
      for (const k of cands) {
        const hit = maps.boundaryIdByIcao.get(normId(k));
        if (hit) {
          boundaryId = normId(hit);
          break;
        }
      }
    }

    if (!boundaryId) continue;

    const arr = online.get(boundaryId) ?? [];
    arr.push(cs);
    online.set(boundaryId, arr);
  }

  return online;
}
