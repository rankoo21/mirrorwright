"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface EtchPanelProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

// A faint pane of context floating near the glass, never a solid card. Used for
// readouts and answer context. No hard borders or fills that read as UI cards.
export function EtchPanel({ children, className = "", delay = 0 }: EtchPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.4, delay, ease: "easeOut" }}
      className={`relative ${className}`}
      style={{
        background: "linear-gradient(160deg, rgba(199,205,212,0.03), transparent)",
      }}
    >
      {children}
    </motion.div>
  );
}
