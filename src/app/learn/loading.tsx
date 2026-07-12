export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div>
        <div className="h-7 w-16 bg-[#e5e5e5] rounded mb-1" />
        <div className="h-4 w-40 bg-[#f0f0f0] rounded" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[#e5e5e5] bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f0f0f0] rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-[#e5e5e5] rounded" />
            <div className="h-3 w-1/2 bg-[#f0f0f0] rounded" />
          </div>
          <div className="h-5 w-10 bg-[#f0f0f0] rounded" />
        </div>
      ))}
    </div>
  );
}
