import type { VatsimPilot } from "../lib/vatsim";
import type { ZoneHit } from "../lib/zone";
import type { Mode } from "./ModeToggle";
import { fmtNum } from "../lib/format";

export default function ZoneCard({
  mode,
  pilot,
  zone
}: {
  mode: Mode;
  pilot: VatsimPilot | null;
  zone: ZoneHit | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-glow">
      <div className="text-sm font-semibold">Control Zone</div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs text-white/55">Current boundary</div>
        <div className="mt-1 text-xl font-semibold tracking-tight">
          {zone?.id || "—"}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <Meta label="Region" value={zone?.region || "—"} />
          <Meta label="Division" value={zone?.division || "—"} />
          <Meta label="Oceanic" value={zone?.oceanic || "—"} />
        </div>
      </div>

      <div className="mt-4 text-xs text-white/50">
        {pilot
          ? `Point: ${fmtNum(pilot.latitude, 4)}, ${fmtNum(pilot.longitude, 4)}`
          : mode === "active"
          ? "Waiting for your pilot position…"
          : "Switch to Active to detect your zone."}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] text-white/55">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
