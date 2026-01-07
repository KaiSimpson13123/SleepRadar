import { fetchMapData } from "./mapData";

export type FirMaps = {
  boundaryIdByCallsign: Map<string, string>;
  boundaryIdByIcao: Map<string, string>;
};

function normToken(s: string) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_");
}

export async function fetchVatSpyDat(_signal?: AbortSignal): Promise<string> {
  const md = await fetchMapData();
  const api = window.SleepRadar;
  if (!api?.fetchText) throw new Error("SleepRadar.fetchText missing");

  return api.fetchText(md.vatspy_dat_url);
}

export function parseFirMaps(dat: string): FirMaps {
  const boundaryIdByCallsign = new Map<string, string>();
  const boundaryIdByIcao = new Map<string, string>();

  const lines = dat.split(/\r?\n/);
  let inFir = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      const sec = line.toUpperCase();
      inFir = sec === "[FIR]" || sec === "[FIRS]";
      continue;
    }
    if (!inFir) continue;

    const parts = (line.includes("|") ? line.split("|") : line.split(",")).map(
      (x) => x.trim()
    );
    if (parts.length < 4) continue;

    const icao = normToken(parts[0]); // e.g. MMEX
    const callsign = normToken(parts[2]); // e.g. MEX (sometimes)
    const boundary = normToken(parts[3]); // boundary id

    const boundaryId = boundary || icao;

    if (icao) boundaryIdByIcao.set(icao, boundaryId);
    if (callsign) boundaryIdByCallsign.set(callsign, boundaryId);
  }

  console.log(
    "callSign keys sample:",
    Array.from(boundaryIdByCallsign.keys()).slice(0, 30)
  );
  console.log(
    "callSign values sample:",
    Array.from(boundaryIdByCallsign.values()).slice(0, 30)
  );
  console.log(
    "icao keys sample:",
    Array.from(boundaryIdByIcao.keys()).slice(0, 30)
  );
  console.log(
    "icao values sample:",
    Array.from(boundaryIdByIcao.values()).slice(0, 30)
  );

  return { boundaryIdByCallsign, boundaryIdByIcao };
}
