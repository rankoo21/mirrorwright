"use client";

import { motion } from "framer-motion";

interface SilhouetteProps {
  // 0..100 clarity sharpens the silhouette and makes it more human.
  clarity: number;
  // Flicker when a contradiction is held.
  contested?: boolean;
}

// The forming silhouette behind the glass. A vague unformed figure that gains
// definition proportional to clarity. It breathes slowly. The shard field
// traces its outline; this is the soft body of light beneath.
export function Silhouette({ clarity, contested = false }: SilhouetteProps) {
  const c = Math.max(0, Math.min(100, clarity)) / 100;
  const blur = 38 - c * 26; // sharper as clarity rises
  const opacity = 0.1 + c * 0.34;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      animate={
        contested
          ? { opacity: [opacity, opacity * 0.55, opacity], filter: [`blur(${blur}px)`, `blur(${blur + 8}px)`, `blur(${blur}px)`] }
          : { opacity: [opacity * 0.85, opacity, opacity * 0.85] }
      }
      transition={{ duration: contested ? 2.4 : 7, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width="60%" height="80%" viewBox="0 0 200 260" style={{ filter: `blur(${blur}px)` }}>
        <defs>
          <radialGradient id="silh" cx="50%" cy="36%" r="60%">
            <stop offset="0%" stopColor="#C7CDD4" stopOpacity={0.5 + c * 0.4} />
            <stop offset="60%" stopColor="#8DDCFF" stopOpacity={0.12 + c * 0.18} />
            <stop offset="100%" stopColor="#14242A" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Head. */}
        <ellipse cx="100" cy="78" rx="40" ry="46" fill="url(#silh)" />
        {/* Neck and shoulders. */}
        <path
          d="M70 116 Q100 140 130 116 L168 220 Q100 250 32 220 Z"
          fill="url(#silh)"
        />
      </svg>
    </motion.div>
  );
}
