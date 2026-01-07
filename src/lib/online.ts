import type { VatsimData } from "./vatsim";

export type OnlineFir = {
  id: string; // FIR id, e.g. "KZLA"
  callsigns: string[];
};

const DEFAULT_SUFFIXES = ["CTR", "FSS"];

// Some places use callsigns that don't equal the FIR ID.
// Add overrides here as you discover them.
const OVERRIDES: Record<string, string[]> = {
  // "EGTT": ["LON"],  // example shape: FIR -> possible prefixes
  // "KZLA": ["ZLA"],  // sometimes K-prefix is omitted
};

function splitCallsign(cs: string) {
  const parts = cs.toUpperCase().trim().split("_");
  if (parts.length < 2) return null;
  const suffix = parts[parts.length - 1];
  const prefix = parts.slice(0, -1).join("_");
  return { prefix, suffix };
}

export function computeOnlineFirs(data: VatsimData) {
  const firToCallsigns = new Map<string, string[]>();

  for (const c of data.controllers ?? []) {
    const cs = String(c.callsign || "");
    const s = splitCallsign(cs);
    if (!s) continue;

    // limit to the types you care about (CTR/FSS)
    if (!DEFAULT_SUFFIXES.includes(s.suffix)) continue;

    // Primary: FIR id equals prefix (KZLA_CTR -> KZLA)
    const firId = s.prefix;

    if (!firToCallsigns.has(firId)) firToCallsigns.set(firId, []);
    firToCallsigns.get(firId)!.push(cs);
  }

  // Apply overrides by copying matches onto FIR IDs
  for (const [firId, prefixes] of Object.entries(OVERRIDES)) {
    for (const [seenFir, callsigns] of firToCallsigns.entries()) {
      if (prefixes.includes(seenFir)) {
        const cur = firToCallsigns.get(firId) ?? [];
        firToCallsigns.set(firId, [...cur, ...callsigns]);
      }
    }
  }

  return firToCallsigns; // Map<FIR_ID, callsigns[]>
}
