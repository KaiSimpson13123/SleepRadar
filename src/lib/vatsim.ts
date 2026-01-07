export type VatsimController = {
  cid: number;
  name: string;
  callsign: string;
  frequency: string;
  facility: number; // 0..6 (CTR is usually 6)
  rating: number;
  server: string;
  visual_range: number;
  text_atis?: string[];
  last_updated: string;
  logon_time: string;
};

export type VatsimPilot = {
  cid: number;
  name: string;
  callsign: string;
  latitude: number;
  longitude: number;
  altitude: number;
  groundspeed: number;
  heading: number;
  flight_plan?: {
    departure?: string;
    arrival?: string;
    aircraft_faa?: string;
    aircraft_short?: string;
    aircraft?: string;
  };
};

export type VatsimData = {
  general: { update_timestamp: string };
  pilots: VatsimPilot[];
  controllers: VatsimController[];
  // (don’t add `firs` here — vatsim-data.json doesn't have that)
};


export async function fetchVatsimData(signal?: AbortSignal): Promise<VatsimData> {
  const r = await fetch("https://data.vatsim.net/v3/vatsim-data.json", { signal });
  if (!r.ok) throw new Error(`VATSIM fetch failed: ${r.status}`);
  return (await r.json()) as VatsimData;
}

export function findPilotByCid(data: VatsimData, cid: string): VatsimPilot | null {
  const target = Number(cid);
  if (!Number.isFinite(target)) return null;
  return data.pilots.find((p) => p.cid === target) ?? null;
}
