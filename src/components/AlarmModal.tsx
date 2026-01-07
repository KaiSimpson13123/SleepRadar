import { useEffect } from "react";

export default function AlarmModal({
  open,
  title,
  subtitle,
  onDismiss,
  onAcknowledge, // used to force audio play on click if autoplay blocked
}: {
  open: boolean;
  title: string;
  subtitle?: string | null;
  onDismiss: () => void;
  onAcknowledge?: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onMouseDown={() => onAcknowledge?.()}
    >
      <div
        className="w-[min(560px,92vw)] rounded-3xl border border-white/10 bg-zinc-950/90 p-6 shadow-[0_0_80px_rgba(34,197,94,0.12)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-white/60">SleepRadar Alert</div>
            <div className="mt-1 text-xl font-semibold tracking-tight">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-2 text-sm text-white/70 leading-relaxed">
                {subtitle}
              </div>
            ) : null}
          </div>

          <div className="h-10 w-10 shrink-0 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
            <span className="text-lg">🚨</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            onClick={() => {
              onAcknowledge?.();
              onDismiss();
            }}
          >
            Dismiss
          </button>
        </div>

        <div className="mt-3 text-xs text-white/40">
          Tip: Press <b>Esc</b> to dismiss.
        </div>
      </div>
    </div>
  );
}
