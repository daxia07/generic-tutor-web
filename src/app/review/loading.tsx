export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-16 bg-[#e5e5e5] rounded mb-1" />
          <div className="h-4 w-32 bg-[#f0f0f0] rounded" />
        </div>
        <div className="h-10 w-24 bg-[#fff5e6] rounded-lg" />
      </div>
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-4">
        <div className="flex gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex-1 aspect-square bg-[#f0f0f0] rounded-md" />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 w-full bg-[#f0f0f0] rounded-lg" />
      ))}
      <div className="h-12 w-full bg-[#58cc02]/20 rounded-xl" />
    </div>
  );
}
