import { fetchMapData } from "./mapData";
import { normId } from "./norm";

export type FirBoundaryMaps = {
  boundaryIdByFirIcao: Map<string, string>;
};

export async function fetchFirBoundariesDat(): Promise<string> {
  const md = await fetchMapData();
  const api = window.SleepRadar;
  if (!api?.fetchText) throw new Error("SleepRadar.fetchText missing");
  return api.fetchText(md.fir_boundaries_dat_url);
}

function isNumericToken(s: string) {
  if (!s) return false;
  const n = Number(s);
  return Number.isFinite(n);
}

function looksLikeBoundaryId(id: string) {
  // Reject decimals like "108.831833" automatically by not allowing dots
  return /^[A-Z0-9_]{2,20}$/.test(id);
}

export function parseFirBoundariesDat(txt: string): FirBoundaryMaps {
  const boundaryIdByFirIcao = new Map<string, string>();

  const lines = txt.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;

    const parts = (line.includes("|") ? line.split("|") : line.split(","))
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length < 2) continue;

    const fir = normId(parts[0]);
    if (!fir) continue;

    // Find the first non-numeric "ID-like" token after FIR
    let boundary: string | null = null;

    for (let i = 1; i < parts.length; i++) {
      const tRaw = parts[i];
      const t = normId(tRaw);

      if (!t) continue;
      if (isNumericToken(tRaw)) continue;      // <- stops picking lon/lat
      if (!looksLikeBoundaryId(t)) continue;   // <- stops weird strings
      if (t === fir) continue;

      boundary = t;
      break;
    }

    if (boundary) boundaryIdByFirIcao.set(fir, boundary);
  }

  return { boundaryIdByFirIcao };
}