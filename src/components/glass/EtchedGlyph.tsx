"use client";

import { motion } from "framer-motion";
import type { SurfaceMode } from "@/store/useMirrorStore";

// A glyph etched into the silver frame. Touching it tilts the glass toward a
// mode. The active glyph glows; the others stay faint. This is The Tilt's
// constellation, not a navbar.

export interface GlyphSpec {
  mode: SurfaceMode;
  label: string;
  // A simple geometric mark drawn in SVG, abstract and etched.
  draw: ReactNodePath;
}

type ReactNodePath = JSX.Element;

interface EtchedGlyphProps {
  spec: GlyphSpec;
  active: boolean;
  disabled?: boolean;
  onSelect: (mode: SurfaceMode) => void;
}

export function EtchedGlyph({ spec, active, disabled, onSelect }: EtchedGlyphProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={spec.label}
      disabled={disabled}
      onClick={() => onSelect(spec.mode)}
      className="group relative flex flex-col items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <motion.svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        animate={{
          opacity: active ? 1 : 0.4,
          filter: active ? "drop-shadow(0 0 8px rgba(199,205,212,0.6))" : "none",
        }}
        transition={{ duration: 0.9 }}
        className="text-mercury"
      >
        {spec.draw}
      </motion.svg>
      <span
        className={`etched transition-opacity duration-500 ${
          active ? "opacity-90" : "opacity-0 group-hover:opacity-60"
        }`}
        style={{ fontSize: "0.5rem" }}
      >
        {spec.label}
      </span>
    </button>
  );
}

// The six glyphs, abstract marks etched into the frame.
export const GLYPHS: GlyphSpec[] = [
  {
    mode: "dim",
    label: "The Dim Glass",
    draw: (
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1" opacity="0.8" />
    ),
  },
  {
    mode: "feeding",
    label: "The Feeding",
    draw: (
      <>
        <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="1" />
        <line x1="7" y1="20" x2="17" y2="20" stroke="currentColor" strokeWidth="1" />
      </>
    ),
  },
  {
    mode: "resolve",
    label: "The Resolve",
    draw: (
      <>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1" />
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
      </>
    ),
  },
  {
    mode: "speaking",
    label: "The Speaking",
    draw: (
      <>
        <path d="M5 12 H19" stroke="currentColor" strokeWidth="1" />
        <path d="M9 8 L5 12 L9 16" stroke="currentColor" strokeWidth="1" fill="none" />
        <path d="M15 8 L19 12 L15 16" stroke="currentColor" strokeWidth="1" fill="none" />
      </>
    ),
  },
  {
    mode: "correction",
    label: "The Correction",
    draw: (
      <>
        <line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" strokeWidth="1" />
        <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1" />
      </>
    ),
  },
  {
    mode: "depths",
    label: "The Depths",
    draw: (
      <>
        <path d="M4 8 Q12 12 20 8" stroke="currentColor" strokeWidth="0.9" fill="none" />
        <path d="M4 13 Q12 17 20 13" stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.7" />
        <path d="M4 18 Q12 22 20 18" stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.45" />
      </>
    ),
  },
];
