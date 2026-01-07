import { fetchMapData } from "./mapData";
import { normId } from "./norm";

export type FirBoundaryMaps = {
  // FIR ICAO (e.g. MMEX) -> boundary polygon id (e.g. MMFR)
  boundaryIdByFirIcao: Map<string, string>;
};

/**
 * Downloads the VATSIM-provided FIR boundary mapping file (fir_boundaries.dat)
 * and builds FIR ICAO -> GeoJSON boundary id map.
 */
export async function fetchFirBoundariesDat(): Promise<string> {
  const md = await fetchMapData();
  const api = window.SleepRadar;
  if (!api?.fetchText) throw new Error("SleepRadar.fetchText missing");
  return api.fetchText(md.fir_boundaries_dat_url);
}

export function parseFirBoundariesDat(txt: string): FirBoundaryMaps {
  const boundaryIdByFirIcao = new Map<string, string>();

  const lines = txt.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;

    // tolerate both "|" and "," formats
    const parts = (line.includes("|") ? line.split("|") : line.split(","))
      .map((p) => p.trim());

    // Common formats include at least FIR + boundary id somewhere.
    // We’ll try to pick sensible columns:
    //
    // Often: FIR_ICAO | Name | Boundary_ID
    // Sometimes: FIR_ICAO | Boundary_ID | ...
    //
    if (parts.length < 2) continue;

    const fir = normId(parts[0]);

    // Choose the last token as boundary id (usually safest)
    const boundary = normId(parts[parts.length - 1]);

    if (fir && boundary) boundaryIdByFirIcao.set(fir, boundary);
  }

  return { boundaryIdByFirIcao };
}

