export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#e5e5e5] bg-white p-4">
            <div className="h-3 w-12 bg-[#e5e5e5] rounded mb-2" />
            <div className="h-8 w-16 bg-[#f0f0f0] rounded" />
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#e5e5e5] bg-white p-4 space-y-3">
            <div className="h-5 w-32 bg-[#e5e5e5] rounded" />
            <div className="h-4 w-full bg-[#f0f0f0] rounded" />
            <div className="h-4 w-3/4 bg-[#f0f0f0] rounded" />
            <div className="h-10 w-full bg-[#58cc02]/20 rounded-xl" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 space-y-2">
        <div className="h-5 w-24 bg-[#e5e5e5] rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-full bg-[#f0f0f0] rounded" />
        ))}
      </div>
    </div>
  );
}
