"use client";

import { motion } from "framer-motion";

interface BreathFogProps {
  intensity?: number; // 0..1
}

// The breath fog cycle drifting across the glass at idle. Soft condensation that
// swells and fades, as if the room itself is breathing on the mirror.
export function BreathFog({ intensity = 1 }: BreathFogProps) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -inset-x-10 top-1/4 h-1/2 breath-fog"
        animate={{ opacity: [0.1 * intensity, 0.4 * intensity, 0.1 * intensity], x: ["-3%", "3%", "-3%"] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -inset-x-10 top-1/3 h-1/3 breath-fog"
        animate={{ opacity: [0.08 * intensity, 0.28 * intensity, 0.08 * intensity], x: ["4%", "-4%", "4%"] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}
