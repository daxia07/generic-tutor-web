export default function Loading() {
  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4 animate-pulse">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-[#58cc02]/20" />
      <div className="h-7 w-48 mx-auto bg-[#e5e5e5] rounded" />
      <div className="h-4 w-64 mx-auto bg-[#f0f0f0] rounded" />
      <div className="space-y-2 max-w-sm mx-auto mt-6">
        <div className="h-3 w-full bg-[#f0f0f0] rounded" />
        <div className="h-3 w-3/4 bg-[#f0f0f0] rounded" />
        <div className="h-3 w-5/6 bg-[#f0f0f0] rounded" />
      </div>
      <div className="h-12 w-40 mx-auto bg-[#58cc02]/20 rounded-xl mt-6" />
    </div>
  );
}
