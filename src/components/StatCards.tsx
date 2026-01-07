import type { VatsimPilot } from "../lib/vatsim";
import { fmtNum } from "../lib/format";
import type { Mode } from "./ModeToggle";

export default function StatCards({ mode, pilot }: { mode: Mode; pilot: VatsimPilot | null }) {
  const fp = pilot?.flight_plan ?? null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-glow">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Flight</div>
        <div className="text-xs text-white/55">
          {mode === "active" ? "Live" : "Standby"}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card label="Callsign" value={pilot?.callsign || "—"} />
        <Card label="Name" value={pilot?.name || "—"} />
        <Card label="Alt (ft)" value={pilot ? fmtNum(pilot.altitude, 0) : "—"} />
        <Card label="GS (kt)" value={pilot ? fmtNum(pilot.groundspeed, 0) : "—"} />
        <Card label="From" value={fp?.departure || "—"} />
        <Card label="To" value={fp?.arrival || "—"} />
        <Card label="Aircraft" value={fp?.aircraft_short || fp?.aircraft || "—"} />
        <Card label="Heading" value={pilot ? `${fmtNum(pilot.heading, 0)}°` : "—"} />
      </div>

      {!pilot && mode === "active" ? (
        <div className="mt-4 text-sm text-white/60">
          Not currently found on VATSIM (or you’re in observer mode).
        </div>
      ) : null}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-xs text-white/55">{label}</div>
      <div className="mt-1 text-sm font-semibold tracking-wide">{value}</div>
    </div>
  );
}
