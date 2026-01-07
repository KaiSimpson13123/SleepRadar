export type Mode = "standby" | "active";

export default function ModeToggle({
  mode,
  setMode
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-1 shadow-glow flex">
      <button
        onClick={() => setMode("standby")}
        className={[
          "px-4 py-2 rounded-xl text-sm transition",
          mode === "standby" ? "bg-white/10 text-white" : "text-white/70 hover:text-white"
        ].join(" ")}
      >
        Standby
      </button>
      <button
        onClick={() => setMode("active")}
        className={[
          "px-4 py-2 rounded-xl text-sm transition",
          mode === "active" ? "bg-white/10 text-white" : "text-white/70 hover:text-white"
        ].join(" ")}
      >
        Active
      </button>
    </div>
  );
}
