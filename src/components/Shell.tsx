export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-white">
      <div className="fixed inset-0 bg-[#070a12]" />
      <div className="fixed inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(1200px 600px at 18% 12%, rgba(86,121,255,0.20), transparent 60%)," +
            "radial-gradient(900px 500px at 72% 18%, rgba(45,212,191,0.16), transparent 62%)," +
            "radial-gradient(800px 500px at 42% 78%, rgba(255,255,255,0.06), transparent 55%)"
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 py-6">
        {children}
      </div>
    </div>
  );
}
