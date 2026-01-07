import { useState } from "react";

export default function CidGate({ onSave }: { onSave: (cid: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow max-w-xl">
      <div className="text-lg font-semibold">Enter your VATSIM CID</div>
      <div className="mt-1 text-sm text-white/60">
        This is stored locally on your PC and used to find your live pilot session.
      </div>

      <div className="mt-5 flex gap-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 1234567"
          className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-white/20"
        />
        <button
          onClick={() => onSave(value)}
          className="rounded-2xl px-5 py-3 font-semibold bg-white text-black hover:opacity-90"
        >
          Save
        </button>
      </div>

      <div className="mt-4 text-xs text-white/45 leading-relaxed">
        Tip: switch to <span className="text-white/70">Active</span> when you’re flying.
      </div>
    </div>
  );
}
