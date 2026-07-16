export function StatsBar({
  streak,
  xp,
  hearts = 5,
  gems = 0,
}: {
  streak: number;
  xp: number;
  hearts?: number;
  gems?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-2 text-sm font-extrabold">
      <span className="text-[#ff9600]">🔥 {streak}</span>
      <span className="text-[#1cb0f6]">💎 {gems || Math.floor(xp / 10)}</span>
      <span className="text-[#ff4b4b]">❤️ {hearts}</span>
      <span className="text-[#ffc800]">⚡ {xp}</span>
    </div>
  );
}
