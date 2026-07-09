"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

interface HeartsDisplayProps {
  hearts: number;
  maxHearts?: number;
}

export function HeartsDisplay({ hearts, maxHearts = 5 }: HeartsDisplayProps) {
  return (
    <div className="flex items-center gap-0.5">
      <AnimatePresence mode="popLayout">
        {Array.from({ length: maxHearts }).map((_, i) => (
          <motion.div
            key={i < hearts ? `filled-${i}` : `empty-${i}`}
            initial={{ scale: 1 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, rotate: -15 }}
            transition={{ duration: 0.3 }}
          >
            <Heart
              className={`w-5 h-5 ${
                i < hearts
                  ? "text-[#ff4b4b] fill-[#ff4b4b]"
                  : "text-[#e5e5e5] fill-[#e5e5e5]"
              }`}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
