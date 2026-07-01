"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface EtchTextProps {
  children: ReactNode;
  className?: string;
  as?: "p" | "span" | "div" | "h1" | "h2";
  delay?: number;
  fade?: boolean;
}

// Faint text scratched into the silvered glass. Fades in slowly, as if the
// etching is surfacing through condensation.
export function EtchText({ children, className = "", as = "p", delay = 0, fade = true }: EtchTextProps) {
  const Tag = motion[as];
  return (
    <Tag
      className={`etched ${className}`}
      initial={fade ? { opacity: 0 } : false}
      animate={fade ? { opacity: 0.66 } : undefined}
      transition={{ duration: 2.2, delay, ease: "easeOut" }}
    >
      {children}
    </Tag>
  );
}

interface EtchLineProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

// A larger etched line, used for the mirror's own writing on the glass.
export function EtchLine({ children, className = "", delay = 0 }: EtchLineProps) {
  return (
    <motion.p
      className={`etched-line ${className}`}
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 2.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.p>
  );
}
