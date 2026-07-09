"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full h-3 bg-[#e5e5e5] rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-[#58cc02] rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}
