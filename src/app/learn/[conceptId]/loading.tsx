export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-24 bg-[#e5e5e5] rounded" />
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 space-y-3">
        <div className="h-6 w-3/4 bg-[#e5e5e5] rounded" />
        <div className="h-4 w-full bg-[#f0f0f0] rounded" />
        <div className="h-4 w-5/6 bg-[#f0f0f0] rounded" />
        <div className="h-4 w-2/3 bg-[#f0f0f0] rounded" />
      </div>
      <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 space-y-2">
        <div className="h-5 w-32 bg-[#e5e5e5] rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-full bg-[#f0f0f0] rounded" />
        ))}
      </div>
      <div className="h-12 w-full bg-[#1cb0f6]/20 rounded-xl" />
    </div>
  );
}
