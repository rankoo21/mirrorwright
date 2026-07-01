"use client";

import { useEffect, useMemo, useRef } from "react";
import { useReducedMotionPref } from "./useReducedMotionPref";

interface ShardFieldProps {
  // 0..100 clarity drives how tightly the shards gather into the silhouette.
  clarity: number;
  // Fragments of text that drift as shards behind the glass.
  shardTexts: string[];
  // When true, shards are actively flying out to assemble an answer.
  speaking?: boolean;
}

interface Shard {
  text: string;
  baseX: number;
  baseY: number;
  driftPhase: number;
  driftSpeed: number;
  size: number;
  // Target position inside the silhouette outline.
  targetX: number;
  targetY: number;
}

// The instanced text-shard system. A Canvas field of tiny drifting text shards
// that self-assemble into a forming silhouette as clarity rises. This is the
// graceful 2D fallback the concept allows; it keeps the glass feeling alive
// without a heavy 3D dependency.
export function ShardField({ clarity, shardTexts, speaking = false }: ShardFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotionPref();
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  const words = useMemo(() => {
    const pool: string[] = [];
    for (const t of shardTexts) {
      for (const w of t.split(/\s+/)) {
        if (w.length > 1) pool.push(w);
      }
    }
    if (pool.length === 0) {
      // Faint formless shards before any fragment is fed.
      return ["", "", "", "", "", "", "", "", "", "", "", ""];
    }
    return pool.slice(0, 90);
  }, [shardTexts]);

  const shardsRef = useRef<Shard[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const buildShards = (w: number, h: number) => {
      const cx = w / 2;
      const cy = h * 0.46;
      shardsRef.current = words.map((text, i) => {
        // Silhouette target: a head-and-shoulders bust outline.
        const angle = (i / words.length) * Math.PI * 2;
        const bust = bustPoint(angle, i, words.length, cx, cy, Math.min(w, h));
        return {
          text,
          baseX: Math.random() * w,
          baseY: Math.random() * h,
          driftPhase: Math.random() * Math.PI * 2,
          driftSpeed: 0.2 + Math.random() * 0.5,
          size: 9 + Math.random() * 7,
          targetX: bust.x,
          targetY: bust.y,
        };
      });
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      buildShards(canvas.offsetWidth, canvas.offsetHeight);
    };

    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      tRef.current += reduced ? 0 : 0.012;
      ctx.clearRect(0, 0, w, h);

      const gather = Math.max(0, Math.min(1, clarity / 100));

      for (const shard of shardsRef.current) {
        // Position interpolates between free drift and the silhouette target.
        const driftX = shard.baseX + Math.sin(tRef.current * shard.driftSpeed + shard.driftPhase) * 16;
        const driftY = shard.baseY + Math.cos(tRef.current * shard.driftSpeed + shard.driftPhase) * 16;

        // When speaking, shards fly slightly outward then settle, suggesting the
        // answer being assembled from the reflection.
        const speakPush = speaking ? Math.sin(tRef.current * 2 + shard.driftPhase) * 10 : 0;

        const x = driftX + (shard.targetX - driftX) * gather + speakPush;
        const y = driftY + (shard.targetY - driftY) * gather;

        const alpha = 0.12 + gather * 0.5;
        ctx.font = `${shard.size}px Georgia, serif`;
        ctx.fillStyle = `rgba(199,205,212,${alpha})`;
        ctx.fillText(shard.text, x, y);
      }

      if (!reduced) rafRef.current = requestAnimationFrame(render);
    };

    render();
    if (reduced) {
      // Single static frame for reduced motion.
      cancelAnimationFrame(rafRef.current);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [words, clarity, speaking, reduced]);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}

// A point on a head-and-shoulders bust silhouette, so gathered shards trace a
// human reflection rather than a blob.
function bustPoint(angle: number, i: number, total: number, cx: number, cy: number, scale: number) {
  const r = scale * 0.16;
  const headRatio = 0.45;
  if (i % 3 === 0) {
    // Head ring.
    return {
      x: cx + Math.cos(angle) * r,
      y: cy - scale * 0.12 + Math.sin(angle) * r,
    };
  }
  // Shoulders: a wider arc below the head.
  const sx = (i / total) * 2 - 1; // -1..1
  return {
    x: cx + sx * scale * 0.28,
    y: cy + scale * 0.1 + Math.abs(sx) * scale * 0.06 * (headRatio + 0.4),
  };
}
