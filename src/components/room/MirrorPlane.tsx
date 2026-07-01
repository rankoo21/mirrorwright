"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { SurfaceMode } from "@/store/useMirrorStore";
import { MODE_ORDER } from "@/store/useMirrorStore";
import { useReducedMotionPref } from "./useReducedMotionPref";

interface MirrorPlaneProps {
  surface: SurfaceMode;
  clarity: number;
  contested: boolean;
  children: ReactNode;
}

// The full reflective surface. It tilts and rotates in 3D as The Tilt moves
// between modes; the angle of the glass encodes the active mode. With reduced
// motion it becomes a calm cross-fade instead of a rotation.
export function MirrorPlane({ surface, clarity, contested, children }: MirrorPlaneProps) {
  const reduced = useReducedMotionPref();
  const index = MODE_ORDER.indexOf(surface);

  // Map each mode to a distinct tilt so the surface clearly changes aspect.
  const tilts: Record<SurfaceMode, { rotateY: number; rotateX: number }> = {
    dim: { rotateY: 0, rotateX: 0 },
    feeding: { rotateY: -8, rotateX: 3 },
    resolve: { rotateY: 0, rotateX: -2 },
    speaking: { rotateY: 7, rotateX: 2 },
    correction: { rotateY: -5, rotateX: -4 },
    depths: { rotateY: 0, rotateX: 8 },
  };
  const tilt = tilts[surface] ?? { rotateY: 0, rotateX: 0 };

  return (
    <div
      className="relative mx-auto w-full max-w-3xl"
      style={{ perspective: reduced ? undefined : "1800px" }}
    >
      <motion.div
        className="relative"
        animate={
          reduced
            ? { opacity: 1 }
            : { rotateY: tilt.rotateY, rotateX: tilt.rotateX }
        }
        transition={{ type: "spring", stiffness: 42, damping: 18 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* The silver frame and glass. */}
        <div
          className="silver-frame relative overflow-hidden rounded-[40px]"
          style={{ minHeight: "min(78vh, 680px)" }}
        >
          <div className="glass-surface absolute inset-0" />
          {/* Refraction sheen along the edges. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[40px]"
            style={{
              background:
                "linear-gradient(115deg, rgba(239,244,248,0.10) 0%, transparent 22%, transparent 78%, rgba(141,220,255,0.08) 100%)",
            }}
          />
          {/* A faint second reflection, offset, to suggest depth in the glass. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[40px]"
            animate={{ opacity: [0.04, 0.09, 0.04] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            style={{ background: "radial-gradient(60% 50% at 52% 44%, rgba(199,205,212,0.12), transparent 70%)" }}
          />
          <div className="relative z-10 flex h-full min-h-[inherit] flex-col">{children}</div>
        </div>
        {/* The mirror's faint cast shadow on the floor of the room. */}
        <div
          aria-hidden
          className="mx-auto mt-3 h-8 w-3/4 rounded-[50%]"
          style={{ background: "radial-gradient(50% 100% at 50% 0%, rgba(0,0,0,0.6), transparent)" }}
        />
      </motion.div>
    </div>
  );
}
