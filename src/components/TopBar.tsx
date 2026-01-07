export default function TopBar({
  title,
  subtitle,
  loading,
  error,
  lastUpdate
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 shadow-glow grid place-items-center">
            <div className="h-2 w-2 rounded-full bg-white/70" />
          </div>
          <div>
            <div className="text-xl font-semibold tracking-tight">{title}</div>
            <div className="text-sm text-white/60">{subtitle}</div>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
          {loading ? "Updating…" : "Ready"}
        </div>
        <div className="text-xs text-white/50">
          {lastUpdate ? `VATSIM updated: ${new Date(lastUpdate).toLocaleString()}` : "—"}
        </div>
      </div>
    </div>
  );
}
