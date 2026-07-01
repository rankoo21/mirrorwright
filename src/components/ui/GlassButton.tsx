"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  tone?: "mercury" | "ember";
  className?: string;
  type?: "button" | "submit";
}

// Not a rectangular CTA. A faint etched act on the glass that warms when touched.
// The label reads as the act itself ("Let it settle into the glass"), never
// "Submit".
export function GlassButton({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  tone = "mercury",
  className = "",
  type = "button",
}: GlassButtonProps) {
  const isEmber = tone === "ember";
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileHover={disabled ? undefined : { scale: 1.015 }}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      className={`group relative px-6 py-3 rounded-full border transition-colors duration-700 disabled:opacity-40 disabled:cursor-not-allowed ${
        isEmber
          ? "border-ember/40 text-ember hover:border-ember/70"
          : "border-mercury/20 text-mercury hover:border-mercury/45"
      } ${className}`}
      style={{
        background: isEmber
          ? "linear-gradient(160deg, rgba(232,163,106,0.08), rgba(14,15,18,0.4))"
          : "linear-gradient(160deg, rgba(199,205,212,0.05), rgba(14,15,18,0.4))",
        letterSpacing: "0.06em",
      }}
    >
      <span className="relative font-display text-sm">{children}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          boxShadow: isEmber
            ? "0 0 30px rgba(232,163,106,0.25)"
            : "0 0 30px rgba(199,205,212,0.15)",
        }}
      />
    </motion.button>
  );
}
