"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface CondensationProps {
  // 0..1 how fogged the glass is. Wiping reduces it; idle slowly raises it.
  onWipeProgress?: (progress: number) => void;
  active?: boolean;
}

// Breath condensation on the glass. The user wipes across it (drag/pointer) to
// clear a path; at idle it slowly beads back. Used at The Dim Glass entry.
export function Condensation({ onWipeProgress, active = true }: CondensationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wipedRef = useRef(0);
  const [, force] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      paintFog();
    };

    const paintFog = () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const grad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height * 0.42,
        0,
        canvas.width / 2,
        canvas.height * 0.42,
        canvas.width * 0.8,
      );
      grad.addColorStop(0, "rgba(239,244,248,0.20)");
      grad.addColorStop(0.5, "rgba(199,205,212,0.13)");
      grad.addColorStop(1, "rgba(199,205,212,0.05)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const wipe = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * window.devicePixelRatio;
    const y = (clientY - rect.top) * window.devicePixelRatio;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 46 * window.devicePixelRatio, 0, Math.PI * 2);
    ctx.fill();

    wipedRef.current = Math.min(1, wipedRef.current + 0.018);
    onWipeProgress?.(wipedRef.current);
    force((n) => n + 1);
  };

  const pointerDown = useRef(false);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full touch-none"
      style={{ cursor: active ? "grab" : "default" }}
      onPointerDown={(e) => {
        pointerDown.current = true;
        wipe(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointerDown.current) wipe(e.clientX, e.clientY);
      }}
      onPointerUp={() => (pointerDown.current = false)}
      onPointerLeave={() => (pointerDown.current = false)}
    />
  );
}

// The Sill: a thin silver mirror-sill along the bottom where condensation beads
// and runs. Replaces a normal footer.
export function Sill() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-16 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(199,205,212,0.5), transparent)" }}
      />
      {/* Beads of condensation running down the sill. */}
      {[12, 28, 44, 60, 76, 92].map((left, i) => (
        <motion.span
          key={left}
          className="absolute bottom-2 block h-1 w-1 rounded-full"
          style={{ left: `${left}%`, background: "rgba(199,205,212,0.5)" }}
          animate={{ y: [0, 14, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeIn", delay: i * 0.8 }}
        />
      ))}
      <p
        className="absolute inset-x-0 bottom-3 text-center etched"
        style={{ fontSize: "0.55rem", letterSpacing: "0.34em" }}
      >
        GenLayer . Mirrorwright . A self agreed by consensus . Testnet
      </p>
    </div>
  );
}
